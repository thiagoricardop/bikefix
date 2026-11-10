import { spawn } from "node:child_process";

// Google AI Studio currently passes `--host`; Next.js expects `--hostname` / `-H`.
// Normalize that preview argument while forwarding every other CLI option unchanged.
const args = process.argv.slice(2).map((arg) => {
  if (arg === "--host") return "--hostname";
  if (arg.startsWith("--host=")) return `--hostname=${arg.slice("--host=".length)}`;
  return arg;
});

const child = spawn("next", ["dev", ...args], {
  stdio: "inherit",
  shell: process.platform === "win32",
});

child.on("error", (error) => {
  console.error("Failed to start the Next.js development server:", error);
  process.exitCode = 1;
});

child.on("exit", (code, signal) => {
  process.exitCode = code ?? (signal ? 1 : 0);
});
