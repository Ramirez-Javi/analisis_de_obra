/**
 * Renombra la empresa demo de "TEKÓVA S.A." → "TEKOGA"
 * Uso: node scripts/_renombrar-empresa-demo.mjs
 */

import { createRequire } from "module";
const require = createRequire(import.meta.url);
const { PrismaClient } = require("@prisma/client");
const { PrismaPg } = require("@prisma/adapter-pg");
const { config } = require("dotenv");
config();

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

const result = await prisma.empresa.updateMany({
  where: { nombre: "TEKÓVA S.A." },
  data: { nombre: "TEKOGA" },
});

if (result.count === 0) {
  console.log("⚠️  No se encontró empresa 'TEKÓVA S.A.' — puede que ya esté renombrada.");
} else {
  console.log(`✅  Empresa renombrada → TEKOGA (${result.count} registro${result.count !== 1 ? "s" : ""})`);
}

await prisma.$disconnect();
