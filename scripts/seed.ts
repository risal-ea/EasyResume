// Loads a profile JSON (default: the sample) into the data folder.
// Usage: npm run seed [-- path/to/profile.json] [-- --force]
import { readFileSync } from "node:fs";
import { profileExists, saveProfile } from "../src/core/store/profileStore";
import { profilePath } from "../src/paths";

const args = process.argv.slice(2);
const file = args.find((a) => !a.startsWith("--")) ?? "test/fixtures/sample-profile.json";

if (profileExists() && !args.includes("--force")) {
  console.error(`${profilePath()} already exists. Pass --force to overwrite it.`);
  process.exit(1);
}

saveProfile(JSON.parse(readFileSync(file, "utf8")));
console.log(`Loaded ${file} into ${profilePath()}`);
