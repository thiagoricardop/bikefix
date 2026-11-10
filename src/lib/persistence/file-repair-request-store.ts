import { randomUUID } from "node:crypto";
import { chmod, mkdir, open, readFile, readdir, realpath, rename, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { repairRequestRecordSchema, type RepairRequestRecord } from "@/types/domain";

export type NotificationUpdate = Pick<RepairRequestRecord,
  "notificationStatus" | "notificationAttempts" | "notificationAttemptedAt" | "notificationLastError">;

export type CreateRequestResult = { record: RepairRequestRecord; created: boolean };

export class DuplicateSubmissionInProgressError extends Error {
  constructor() { super("A submission with this idempotency key is already being processed."); }
}

export interface RepairRequestStore {
  create(record: RepairRequestRecord): Promise<CreateRequestResult>;
  updateNotification(id: string, update: NotificationUpdate): Promise<RepairRequestRecord>;
  get(id: string): Promise<RepairRequestRecord | null>;
  findByIdempotencyKey(key: string): Promise<RepairRequestRecord | null>;
  listNeedingNotification(): Promise<RepairRequestRecord[]>;
  deleteOlderThan(cutoff: Date): Promise<number>;
}

/**
 * Private file-per-record store for local development and explicitly verified
 * self-hosted Node deployments with a persistent volume. Never place this path
 * inside public/. File permissions are best-effort on Windows and must also be
 * protected by the host's filesystem ACLs.
 */
export class FileRepairRequestStore implements RepairRequestStore {
  constructor(private readonly directory: string) {}

  private async assertOutsidePublic(): Promise<void> {
    const canonicalProspectivePath = async (target: string): Promise<string> => {
      let current = path.resolve(target);
      const suffix: string[] = [];
      while (true) {
        try { return path.resolve(await realpath(current), ...suffix); }
        catch (error) {
          if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
          const parent = path.dirname(current);
          if (parent === current) throw error;
          suffix.unshift(path.basename(current));
          current = parent;
        }
      }
    };
    const [canonicalDirectory, canonicalPublic] = await Promise.all([
      canonicalProspectivePath(this.directory),
      canonicalProspectivePath(path.join(process.cwd(), "public")),
    ]);
    const relative = path.relative(canonicalPublic, canonicalDirectory);
    const pointsIntoPublic = relative === "" || (!relative.startsWith(`..${path.sep}`) && relative !== ".." && !path.isAbsolute(relative));
    if (pointsIntoPublic) throw new Error("Repair-request storage resolves inside public/ and cannot be used.");
  }

  private async prepareDirectory(): Promise<void> {
    // Check before mkdir/chmod so a symlinked path cannot change permissions or
    // create files under public/ before the escape is detected.
    await this.assertOutsidePublic();
    await mkdir(this.directory, { recursive: true, mode: 0o700 });
    await this.assertOutsidePublic();
    try { await chmod(this.directory, 0o700); } catch { /* ACLs on Windows are controlled by the host. */ }
  }

  private filePath(id: string): string {
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id)) {
      throw new Error("Invalid request ID.");
    }
    return path.join(this.directory, `${id}.json`);
  }

  private async writeRecord(record: RepairRequestRecord, exclusive = false): Promise<void> {
    await this.prepareDirectory();
    const finalPath = this.filePath(record.id);
    const tempPath = path.join(this.directory, `.${record.id}.${randomUUID()}.tmp`);
    try {
      await writeFile(tempPath, `${JSON.stringify(record, null, 2)}\n`, {
        encoding: "utf8", mode: 0o600, flag: "wx",
      });
      try { await chmod(tempPath, 0o600); } catch { /* Enforced through host ACLs on Windows. */ }
      if (exclusive) {
        // UUID filenames make collisions vanishingly unlikely; access check provides an explicit duplicate guard.
        try {
          await readFile(finalPath, "utf8");
          throw new Error("A request with this ID already exists.");
        } catch (error) {
          if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
        }
      }
      await rename(tempPath, finalPath);
      try { await chmod(finalPath, 0o600); } catch { /* Enforced through host ACLs on Windows. */ }
    } finally {
      await rm(tempPath, { force: true }).catch(() => undefined);
    }
  }

  async create(record: RepairRequestRecord): Promise<CreateRequestResult> {
    const valid = repairRequestRecordSchema.parse(record);
    if (!valid.idempotencyKey) {
      await this.writeRecord(valid, true);
      return { record: valid, created: true };
    }

    await this.prepareDirectory();
    const lockPath = path.join(this.directory, `.idempotency-${valid.idempotencyKey}.lock`);
    let lockHandle: Awaited<ReturnType<typeof open>> | undefined;
    try {
      lockHandle = await open(lockPath, "wx", 0o600);
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "EEXIST") throw error;
      const existing = await this.findByIdempotencyKey(valid.idempotencyKey);
      if (existing) return { record: existing, created: false };
      // A crashed process can leave a lock behind. Creation itself holds the lock
      // only during a short filesystem transaction (never during notification).
      try {
        const { stat } = await import("node:fs/promises");
        const lockInfo = await stat(lockPath);
        if (Date.now() - lockInfo.mtimeMs > 30_000) {
          await rm(lockPath, { force: true });
          return this.create(valid);
        }
      } catch { /* A concurrently released lock is handled as an in-progress retry. */ }
      throw new DuplicateSubmissionInProgressError();
    }
    try {
      const existing = await this.findByIdempotencyKey(valid.idempotencyKey);
      if (existing) return { record: existing, created: false };
      await this.writeRecord(valid, true);
      return { record: valid, created: true };
    } finally {
      await lockHandle.close().catch(() => undefined);
      await rm(lockPath, { force: true }).catch(() => undefined);
    }
  }

  async findByIdempotencyKey(key: string): Promise<RepairRequestRecord | null> {
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(key)) return null;
    await this.prepareDirectory();
    const files = (await readdir(this.directory, { withFileTypes: true }))
      .filter((entry) => entry.isFile() && /^[0-9a-f-]+\.json$/i.test(entry.name));
    for (const file of files) {
      const raw = await readFile(path.join(this.directory, file.name), "utf8");
      const record = repairRequestRecordSchema.parse(JSON.parse(raw));
      if (record.idempotencyKey === key) return record;
    }
    return null;
  }

  async get(id: string): Promise<RepairRequestRecord | null> {
    await this.prepareDirectory();
    let raw: string;
    try { raw = await readFile(this.filePath(id), "utf8"); }
    catch (error) {
      if ((error as NodeJS.ErrnoException).code === "ENOENT") return null;
      throw error;
    }
    return repairRequestRecordSchema.parse(JSON.parse(raw));
  }

  async updateNotification(id: string, update: NotificationUpdate): Promise<RepairRequestRecord> {
    const existing = await this.get(id);
    if (!existing) throw new Error("Repair request was not found in private storage.");
    const next = repairRequestRecordSchema.parse({ ...existing, ...update, updatedAt: new Date().toISOString() });
    await this.writeRecord(next);
    return next;
  }

  async listNeedingNotification(): Promise<RepairRequestRecord[]> {
    await this.prepareDirectory();
    const files = (await readdir(this.directory, { withFileTypes: true }))
      .filter((entry) => entry.isFile() && /^[0-9a-f-]+\.json$/i.test(entry.name));
    const records: RepairRequestRecord[] = [];
    for (const file of files) {
      const raw = await readFile(path.join(this.directory, file.name), "utf8");
      const record = repairRequestRecordSchema.parse(JSON.parse(raw));
      if (!record.notificationSuppressedAt && (record.notificationStatus === "failed" || record.notificationStatus === "pending")) records.push(record);
    }
    return records.sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  }

  async deleteOlderThan(cutoff: Date): Promise<number> {
    await this.prepareDirectory();
    const files = (await readdir(this.directory, { withFileTypes: true }))
      .filter((entry) => entry.isFile() && /^[0-9a-f-]+\.json$/i.test(entry.name));
    let deleted = 0;
    for (const file of files) {
      const filename = path.join(this.directory, file.name);
      const raw = await readFile(filename, "utf8");
      const record = repairRequestRecordSchema.parse(JSON.parse(raw));
      if (new Date(record.createdAt).getTime() < cutoff.getTime()) {
        await rm(filename);
        deleted += 1;
      }
    }
    return deleted;
  }
}
