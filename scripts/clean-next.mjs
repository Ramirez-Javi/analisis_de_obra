import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const currentFile = fileURLToPath(import.meta.url);
const currentDir = path.dirname(currentFile);
const nextDir = path.join(currentDir, "..", ".next");

await fs.rm(nextDir, { recursive: true, force: true });