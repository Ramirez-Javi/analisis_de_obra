"use strict";

/**
 * PostgreSQL local embebido — ciclo de vida para Electron.
 *
 * Responsabilidades:
 *  - Arrancar el cluster de PostgreSQL local (embedded-postgres).
 *  - Detectar primer arranque y crear la base de datos.
 *  - Aplicar migraciones Prisma (SQL puro) en primer arranque y en
 *    arranques posteriores si hay migraciones nuevas.
 *  - Devolver el DATABASE_URL para que el servidor Next.js lo use.
 *  - Detener el cluster al cerrar la aplicación.
 */

const { app } = require("electron");
const crypto = require("node:crypto");
const fs = require("node:fs");
const path = require("node:path");
const { pathToFileURL } = require("node:url");

// ── Configuración ──────────────────────────────────────────────────────────
const PG_PORT = 5433; // Puerto fijo distinto al 5432 del sistema
const PG_USER = "tekoga";
const PG_PASSWORD = "teko_db_local_k7m9";
const PG_DB = "tekoga";

// ── Estado ──────────────────────────────────────────────────────────────────
let pgInstance = null;

// ── Rutas ───────────────────────────────────────────────────────────────────

/** Directorio de datos de PostgreSQL en la carpeta de datos del usuario */
function getDataDir() {
  return path.join(app.getPath("userData"), "pgdata");
}

/** Directorio de migraciones dentro del servidor Next.js empaquetado */
function getMigrationsDir(serverDir) {
  return path.join(serverDir, "prisma", "migrations");
}

/** Resuelve el entry point ESM de embedded-postgres desde serverDir */
function resolveEpEntry(serverDir) {
  const base = path.join(serverDir, "node_modules", "embedded-postgres");
  const pkgPath = path.join(base, "package.json");
  const pkg = JSON.parse(fs.readFileSync(pkgPath, "utf-8"));

  // El paquete exporta "./dist/index.js" directamente como string
  if (typeof pkg.exports === "string") {
    return path.join(base, pkg.exports);
  }

  // Objeto con subcampos: { ".": "./dist/index.js" } o { import, default, ... }
  if (pkg.exports && typeof pkg.exports === "object") {
    const root = pkg.exports["."] ?? pkg.exports;
    if (typeof root === "string") return path.join(base, root);
    if (typeof root === "object") {
      const entry = root.import ?? root.default ?? root.node ?? root.require;
      if (typeof entry === "string") return path.join(base, entry);
    }
  }

  // Fallback a main
  return path.join(base, pkg.main ?? "index.js");
}

// ── Migraciones ──────────────────────────────────────────────────────────────

/**
 * Aplica todas las migraciones Prisma que aún no han sido registradas.
 * Lee los archivos SQL de la carpeta prisma/migrations y los ejecuta
 * directamente con pg — no depende del CLI de Prisma.
 */
async function applyMigrations(connectionString, serverDir) {
  const { Client } = require(path.join(serverDir, "node_modules", "pg"));
  const migrationsDir = getMigrationsDir(serverDir);

  if (!fs.existsSync(migrationsDir)) {
    console.log("[postgres] Sin directorio de migraciones, se omite el paso.");
    return;
  }

  const client = new Client({ connectionString });
  await client.connect();

  // Tabla de seguimiento compatible con Prisma Migrate
  await client.query(`
    CREATE TABLE IF NOT EXISTS "_prisma_migrations" (
      id                  VARCHAR(36)  NOT NULL PRIMARY KEY,
      checksum            VARCHAR(64)  NOT NULL,
      finished_at         TIMESTAMPTZ,
      migration_name      VARCHAR(255) NOT NULL,
      logs                TEXT,
      rolled_back_at      TIMESTAMPTZ,
      started_at          TIMESTAMPTZ  NOT NULL DEFAULT now(),
      applied_steps_count INTEGER      NOT NULL DEFAULT 0
    )
  `);

  const { rows } = await client.query(
    `SELECT migration_name FROM "_prisma_migrations" WHERE finished_at IS NOT NULL`
  );
  const applied = new Set(rows.map((r) => r.migration_name));

  const folders = fs
    .readdirSync(migrationsDir, { withFileTypes: true })
    .filter((e) => e.isDirectory())
    .map((e) => e.name)
    .sort();

  for (const folder of folders) {
    if (applied.has(folder)) continue;

    const sqlPath = path.join(migrationsDir, folder, "migration.sql");
    if (!fs.existsSync(sqlPath)) continue;

    const sql = fs.readFileSync(sqlPath, "utf-8");
    const id = crypto.randomUUID();
    const checksum = crypto.createHash("sha256").update(sql).digest("hex");

    await client.query("BEGIN");
    try {
      await client.query(sql);
      await client.query(
        `INSERT INTO "_prisma_migrations"
           (id, checksum, migration_name, finished_at, applied_steps_count)
         VALUES ($1, $2, $3, now(), 1)`,
        [id, checksum, folder]
      );
      await client.query("COMMIT");
      console.log(`[postgres] Migración aplicada: ${folder}`);
    } catch (err) {
      await client.query("ROLLBACK");
      await client.end();
      throw new Error(`Migración "${folder}" falló: ${err.message}`);
    }
  }

  await client.end();
}

// ── API pública ──────────────────────────────────────────────────────────────

/**
 * Inicia el cluster PostgreSQL local.
 * En el primer arranque crea la base de datos y aplica todas las migraciones.
 * En arranques posteriores solo arranca el cluster y aplica las migraciones
 * pendientes (si las hay).
 *
 * @param {string} serverDir  Ruta al directorio del servidor Next.js empaquetado.
 * @returns {Promise<string>} DATABASE_URL para el servidor Next.js.
 */
async function startPostgres(serverDir) {
  const dataDir = getDataDir();
  const isFirstRun = !fs.existsSync(path.join(dataDir, "PG_VERSION"));

  // Carga el módulo ESM embedded-postgres desde serverDir (en disco, no en asar)
  const epEntry = resolveEpEntry(serverDir);
  const { default: EmbeddedPostgres } = await import(pathToFileURL(epEntry).href);

  pgInstance = new EmbeddedPostgres({
    databaseDir: dataDir,
    user: PG_USER,
    password: PG_PASSWORD,
    port: PG_PORT,
    persistent: true,
    onLog: () => {}, // silenciar ruido de inicio en consola Electron
    onError: () => {},
  });

  await pgInstance.initialise();
  await pgInstance.start();

  // Primer arranque: crear la base de datos de la aplicación
  if (isFirstRun) {
    await pgInstance.createDatabase(PG_DB);
  }

  const connectionString = `postgresql://${PG_USER}:${encodeURIComponent(PG_PASSWORD)}@127.0.0.1:${PG_PORT}/${PG_DB}`;

  // Siempre intentar aplicar migraciones pendientes (idempotente)
  await applyMigrations(connectionString, serverDir);

  return connectionString;
}

/**
 * Detiene el cluster PostgreSQL de forma ordenada.
 * Seguro de llamar aunque el cluster no esté corriendo.
 */
async function stopPostgres() {
  if (pgInstance) {
    try {
      await pgInstance.stop();
    } catch {
      // Ignorar errores al cerrar — PostgreSQL puede recuperarse del kill
    }
    pgInstance = null;
  }
}

module.exports = { startPostgres, stopPostgres };
