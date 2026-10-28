import os from "node:os";
import path from "node:path";

/** Root folder for all user data. Override with EASYRESUME_HOME. */
export function dataDir(): string {
  return process.env.EASYRESUME_HOME || path.join(os.homedir(), ".easyresume");
}

export function profilePath(): string {
  return path.join(dataDir(), "profile.json");
}

export function resumesDir(): string {
  return path.join(dataDir(), "resumes");
}

export function webLogPath(): string {
  return path.join(dataDir(), "web.log");
}

export const HOST = "127.0.0.1";

export function webPort(): number {
  const port = Number(process.env.EASYRESUME_PORT);
  return Number.isInteger(port) && port > 0 ? port : 4747;
}

export function webUrl(pathname = ""): string {
  return `http://localhost:${webPort()}${pathname}`;
}
