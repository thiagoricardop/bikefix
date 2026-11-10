import { randomUUID } from 'node:crypto';
import { appendFile, chmod, mkdir, readFile, readdir, realpath, rename, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';

const [action, idArg] = process.argv.slice(2);
const flags = new Set(process.argv.slice(2).filter((argument) => argument.startsWith('--')));
const isProduction = process.env.NODE_ENV === 'production';
const configuredDirectory = process.env.REPAIR_REQUEST_STORAGE_DIR?.trim();
if (isProduction && (!configuredDirectory || !path.isAbsolute(configuredDirectory))) {
  console.error('Refusing to run production request operations without an absolute REPAIR_REQUEST_STORAGE_DIR.');
  process.exit(2);
}
const directory = configuredDirectory ? path.resolve(configuredDirectory) : path.resolve('.data/repair-requests');
const publicDirectory = path.resolve('public');
const relative = path.relative(publicDirectory, directory);
if (relative === '' || (!relative.startsWith(`..${path.sep}`) && relative !== '..' && !path.isAbsolute(relative))) {
  console.error('Refusing to operate on a request directory inside public/.');
  process.exit(2);
}
const operator = process.env.REPAIR_REQUEST_OPERATOR_ID?.trim() || (isProduction ? '' : 'local-development-operator');
if (isProduction && !operator) {
  console.error('Refusing operator actions without REPAIR_REQUEST_OPERATOR_ID for the audit log.');
  process.exit(2);
}
if (isProduction && process.env.REPAIR_REQUEST_ACCESS_CONTROL_CONFIRMED !== 'true') {
  console.error('Refusing production operator actions until private operator access has been verified.');
  process.exit(2);
}
if (isProduction && process.env.REPAIR_REQUEST_AUDIT_LOG_CONFIRMED !== 'true') {
  console.error('Refusing production operator actions until private audit logging has been verified.');
  process.exit(2);
}

async function assertOutsidePublic() {
  async function canonicalProspectivePath(target) {
    let current = path.resolve(target);
    const suffix = [];
    while (true) {
      try { return path.resolve(await realpath(current), ...suffix); }
      catch (error) {
        if (error?.code !== 'ENOENT') throw error;
        const parent = path.dirname(current);
        if (parent === current) throw error;
        suffix.unshift(path.basename(current));
        current = parent;
      }
    }
  }
  const [actualDirectory, actualPublicDirectory] = await Promise.all([
    canonicalProspectivePath(directory), canonicalProspectivePath(publicDirectory),
  ]);
  const pathFromPublic = path.relative(actualPublicDirectory, actualDirectory);
  if (pathFromPublic === '' || (!pathFromPublic.startsWith(`..${path.sep}`) && pathFromPublic !== '..' && !path.isAbsolute(pathFromPublic))) {
    throw new Error('Request storage resolves inside public/ and cannot be used.');
  }
}

async function prepareDirectory() {
  await assertOutsidePublic();
  await mkdir(directory, { recursive: true, mode: 0o700 });
  await assertOutsidePublic();
  try { await chmod(directory, 0o700); } catch { /* Windows ACLs must protect the directory. */ }
}

async function appendAudit(actionName, recordId, outcome = 'success') {
  if (!operator) throw new Error('Set REPAIR_REQUEST_OPERATOR_ID before operator actions so the audit log identifies an authorized operator.');
  await prepareDirectory();
  const auditPath = path.join(directory, 'operations-audit.jsonl');
  const entry = { at: new Date().toISOString(), operator, action: actionName, recordId, outcome };
  await appendFile(auditPath, `${JSON.stringify(entry)}\n`, { encoding: 'utf8', mode: 0o600 });
  try { await chmod(auditPath, 0o600); } catch { /* Windows ACLs must protect the directory. */ }
}

function recordFilename(id) {
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id || '')) {
    throw new Error('Provide a valid request UUID.');
  }
  return path.join(directory, `${id}.json`);
}

async function loadRecords() {
  await prepareDirectory();
  const entries = (await readdir(directory, { withFileTypes: true })).filter((entry) => entry.isFile() && /^[0-9a-f-]+\.json$/i.test(entry.name));
  const records = [];
  for (const entry of entries) {
    const file = path.join(directory, entry.name);
    const record = JSON.parse(await readFile(file, 'utf8'));
    if (!record || !/^[0-9a-f-]{36}$/i.test(record.id || '') || !record.createdAt || !record.notificationStatus) {
      throw new Error(`Invalid repair-request record shape in ${entry.name}; no data was changed.`);
    }
    records.push({ file, record });
  }
  return records;
}

async function readRecord(id) {
  await prepareDirectory();
  const filename = recordFilename(id);
  const record = JSON.parse(await readFile(filename, 'utf8'));
  if (record.id !== id) throw new Error('Record identifier does not match its filename.');
  return { filename, record };
}

async function writeRecord(file, record) {
  const temp = path.join(directory, `.${record.id}.${randomUUID()}.tmp`);
  try {
    await writeFile(temp, `${JSON.stringify(record, null, 2)}\n`, { encoding: 'utf8', mode: 0o600, flag: 'wx' });
    try { await chmod(temp, 0o600); } catch { /* Windows ACLs must protect the directory. */ }
    await rename(temp, file);
    try { await chmod(file, 0o600); } catch { /* Windows ACLs must protect the directory. */ }
  } finally {
    await rm(temp, { force: true }).catch(() => undefined);
  }
}

async function retryNotifications() {
  if (isProduction && process.env.REPAIR_REQUEST_NOTIFICATION_PROCESSING_APPROVED !== 'true') {
    throw new Error('Refusing production notification retries until request-detail processing by Resend/the destination mailbox has been approved.');
  }
  const apiKey = process.env.RESEND_API_KEY?.trim();
  const destination = process.env.REPAIR_REQUEST_NOTIFICATION_EMAIL?.trim();
  const from = process.env.REPAIR_REQUEST_FROM_EMAIL?.trim();
  if (!apiKey || !destination || !from) throw new Error('Notification retry requires RESEND_API_KEY, REPAIR_REQUEST_NOTIFICATION_EMAIL, and REPAIR_REQUEST_FROM_EMAIL.');
  const records = await loadRecords();
  const pending = records.filter(({ record }) => ['failed', 'pending'].includes(record.notificationStatus) && !record.notificationSuppressedAt);
  let accepted = 0;
  let failed = 0;
  for (const { file, record } of pending) {
    await appendAudit('retry-notification', record.id, 'authorized');
    const text = [
      `BikeFix repair-guide request ${record.id}`, '', `Summary: ${record.summary}`,
      `Bicycle type: ${record.bicycleType}`, `Component: ${record.componentId || 'Not specified'}`,
      `Description: ${record.description}`, `What they tried: ${record.triedAlready || 'Not specified'}`,
      record.wantsReply && record.email ? `Reply requested: yes\nContact email: ${record.email}` : 'Reply requested: no',
      '', 'This notification contains a private guide request. Do not forward or publish without authorization.',
    ].join('\n');
    let nextStatus = 'failed';
    let errorCode = 'provider_unreachable';
    try {
      const response = await fetch('https://api.resend.com/emails', {
        method: 'POST', headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json', 'Idempotency-Key': `repair-request-notification/${record.id}` },
        body: JSON.stringify({ from, to: [destination], subject: `BikeFix repair-guide request ${record.id}`, text }),
        signal: AbortSignal.timeout(8_000),
      });
      if (response.ok) { nextStatus = 'accepted'; errorCode = null; }
      else errorCode = `provider_rejected_http_${response.status}`;
    } catch { /* Store only a compact error code, never provider details or secrets. */ }
    record.notificationStatus = nextStatus;
    record.notificationAttempts = Math.max(0, Number(record.notificationAttempts) || 0) + 1;
    record.notificationAttemptedAt = new Date().toISOString();
    record.notificationLastError = errorCode;
    record.updatedAt = new Date().toISOString();
    await writeRecord(file, record);
    await appendAudit('retry-notification', record.id, nextStatus);
    if (nextStatus === 'accepted') accepted += 1; else failed += 1;
  }
  console.log(`Notification retry complete. Considered ${pending.length}; provider-accepted ${accepted}; failed ${failed}. Accepted does not mean delivered.`);
  if (failed) process.exitCode = 1;
}

async function expireRecords() {
  if (process.env.REPAIR_REQUEST_RETENTION_APPROVED !== 'true' || process.env.REPAIR_REQUEST_RETENTION_JOB_CONFIRMED !== 'true') {
    throw new Error('Refusing retention without explicit owner approval and a confirmed cleanup policy.');
  }
  const rawDays = process.env.REPAIR_REQUEST_RETENTION_DAYS || '';
  if (!/^\d+$/.test(rawDays) || Number(rawDays) < 1 || Number(rawDays) > 3650) {
    throw new Error('REPAIR_REQUEST_RETENTION_DAYS must be an approved whole-number duration between 1 and 3650 days.');
  }
  const days = Number(rawDays);
  const cutoff = Date.now() - days * 24 * 60 * 60 * 1000;
  const records = await loadRecords();
  const expired = records.filter(({ record }) => Date.parse(record.createdAt) < cutoff);
  if (!flags.has('--apply')) {
    console.log(`Dry run: ${expired.length} request record(s) are older than the configured ${days}-day policy. Re-run with --apply to delete all old records, including unresolved requests, as specified by the approved policy.`);
    return;
  }
  for (const { file, record } of expired) {
    await appendAudit('retention-delete', record.id, 'authorized');
    await rm(file);
    await appendAudit('retention-delete', record.id, 'deleted');
  }
  console.log(`Retention applied: deleted ${expired.length} request record(s) older than the approved ${days}-day limit.`);
}

async function showList() {
  const records = (await loadRecords()).sort((a, b) => b.record.createdAt.localeCompare(a.record.createdAt));
  await appendAudit('list', 'multiple', `count-${records.length}`);
  console.log(JSON.stringify(records.map(({ record }) => ({ id: record.id, createdAt: record.createdAt, status: record.status, notificationStatus: record.notificationStatus })), null, 2));
}

async function showRecord(id, exportMode = false) {
  const { record } = await readRecord(id);
  await appendAudit(exportMode ? 'export' : 'show', id, 'private-data-read');
  console.log(JSON.stringify(record, null, 2));
}

async function deleteRecord(id) {
  if (!flags.has('--confirm')) throw new Error('Deletion is destructive. Repeat the command with --confirm after verifying the request UUID.');
  const { filename } = await readRecord(id);
  await appendAudit('delete', id, 'authorized');
  await rm(filename);
  await appendAudit('delete', id, 'deleted');
  console.log('Request record deleted from the primary store. Copies in email-provider systems or backups are not removed by this command.');
}

async function setStatus(id, status) {
  const allowed = new Set(['new', 'under_review', 'planned', 'published', 'declined']);
  if (!allowed.has(status)) throw new Error('Status must be one of: new, under_review, planned, published, declined.');
  if (!flags.has('--confirm')) throw new Error('Status changes affect triage. Repeat with --confirm after verifying the request UUID and new status.');
  const { filename, record } = await readRecord(id);
  await appendAudit('set-status', id, `requested-${status}`);
  record.status = status;
  record.updatedAt = new Date().toISOString();
  await writeRecord(filename, record);
  await appendAudit('set-status', id, `set-${status}`);
  console.log(`Request status updated to ${status}.`);
}

async function anonymizeRecord(id) {
  if (!flags.has('--confirm')) throw new Error('Anonymization changes stored content. Repeat the command with --confirm after reviewing the request UUID.');
  const { filename, record } = await readRecord(id);
  await appendAudit('anonymize', id, 'authorized');
  record.summary = 'Anonymized request';
  record.description = 'Request details removed by an authorized operator.';
  record.triedAlready = undefined;
  record.email = '';
  record.wantsReply = false;
  record.notificationSuppressedAt = new Date().toISOString();
  record.updatedAt = new Date().toISOString();
  await writeRecord(filename, record);
  await appendAudit('anonymize', id, 'anonymized-primary-record');
  console.log('Request content and contact email were removed from the primary record, and further notification retries are suppressed. Provider emails and backups may still contain previous copies.');
}

try {
  // Resolve symlinks before any record read/write so a lexical path outside
  // public/ cannot point into a publicly served directory.
  await prepareDirectory();
  if (action === 'retry-notifications') await retryNotifications();
  else if (action === 'expire') await expireRecords();
  else if (action === 'list') await showList();
  else if (action === 'show' && idArg) await showRecord(idArg);
  else if (action === 'export' && idArg) {
    if (!flags.has('--confirm')) throw new Error('Export is private-data access. Repeat with --confirm and protect the output destination.');
    await showRecord(idArg, true);
  }
  else if (action === 'delete' && idArg) await deleteRecord(idArg);
  else if (action === 'anonymize' && idArg) await anonymizeRecord(idArg);
  else if (action === 'set-status' && idArg) await setStatus(idArg, process.argv.slice(2).find((argument) => ['new', 'under_review', 'planned', 'published', 'declined'].includes(argument)) || '');
  else {
    console.error('Usage: npm run repair-requests:ops -- <list|show UUID|export UUID --confirm|delete UUID --confirm|anonymize UUID --confirm|set-status UUID STATUS --confirm|retry-notifications|expire [--apply]>');
    process.exit(2);
  }
} catch (error) {
  console.error(`Repair-request operation failed safely: ${error instanceof Error ? error.message : 'unknown error'}`);
  process.exit(1);
}
