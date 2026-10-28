import { mkdirSync, renameSync, writeFileSync } from "node:fs";
import path from "node:path";

/** Write via temp file + rename so readers never see a half-written file. */
export function writeFileAtomic(file: string, data: string | Uint8Array): void {
  mkdirSync(path.dirname(file), { recursive: true });
  const tmp = `${file}.${process.pid}.${Date.now()}.tmp`;
  writeFileSync(tmp, data);
  renameSync(tmp, file);
}
