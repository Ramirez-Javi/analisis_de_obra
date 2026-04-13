import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const currentFile = fileURLToPath(import.meta.url);
const currentDir = path.dirname(currentFile);
const projectRoot = path.resolve(currentDir, "..");
const nextStandaloneDir = path.join(projectRoot, ".next", "standalone");
const nextStaticDir = path.join(projectRoot, ".next", "static");
const publicDir = path.join(projectRoot, "public");
const prismaBinaryDir = path.join(projectRoot, "node_modules", ".prisma");
const stageDir = path.join(projectRoot, "dist-electron", "app");
const envFiles = [
  ".env",
  ".env.local",
  ".env.production",
  ".env.production.local",
];

async function pathExists(targetPath) {
  try {
    await fs.access(targetPath);
    return true;
  } catch {
    return false;
  }
}

async function copyIfExists(sourcePath, targetPath) {
  if (!(await pathExists(sourcePath))) {
    return;
  }

  await fs.cp(sourcePath, targetPath, { recursive: true, force: true });
}

async function main() {
  if (!(await pathExists(nextStandaloneDir))) {
    throw new Error("No existe .next/standalone. Ejecuta primero npm run build con output standalone habilitado.");
  }

  await fs.rm(stageDir, { recursive: true, force: true });
  await fs.mkdir(stageDir, { recursive: true });

  await fs.cp(nextStandaloneDir, stageDir, { recursive: true, force: true });

  // Next puede anidar la salida standalone en una carpeta de proyecto si detecta root externo.
  // Reubicamos ese contenido para que server.js quede en la raiz esperada por Electron.
  const rootServerPath = path.join(stageDir, "server.js");
  if (!(await pathExists(rootServerPath))) {
    const entries = await fs.readdir(stageDir, { withFileTypes: true });
    const nestedDir = entries.find((entry) => entry.isDirectory() && entry.name !== ".next" && entry.name !== "public" && entry.name !== "node_modules");

    if (nestedDir) {
      const nestedPath = path.join(stageDir, nestedDir.name);
      const nestedServerPath = path.join(nestedPath, "server.js");

      if (await pathExists(nestedServerPath)) {
        const nestedEntries = await fs.readdir(nestedPath, { withFileTypes: true });

        for (const entry of nestedEntries) {
          await fs.cp(path.join(nestedPath, entry.name), path.join(stageDir, entry.name), {
            recursive: true,
            force: true,
          });
        }

        await fs.rm(nestedPath, { recursive: true, force: true });
      }
    }
  }

  await copyIfExists(nextStaticDir, path.join(stageDir, ".next", "static"));
  await copyIfExists(publicDir, path.join(stageDir, "public"));
  await copyIfExists(prismaBinaryDir, path.join(stageDir, "node_modules", ".prisma"));

  for (const envFile of envFiles) {
    const sourcePath = path.join(projectRoot, envFile);
    const targetPath = path.join(stageDir, envFile);
    await copyIfExists(sourcePath, targetPath);
  }
}

main().catch((error) => {
  console.error("[prepare-electron]", error);
  process.exitCode = 1;
});