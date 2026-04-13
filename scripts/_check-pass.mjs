import { createRequire } from "module";
const require = createRequire(import.meta.url);
const { PrismaClient } = require("@prisma/client");
const { PrismaPg } = require("@prisma/adapter-pg");
const { config } = require("dotenv");
const bcrypt = require("bcryptjs");
config();

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const p = new PrismaClient({ adapter });
const email = "admin@tekoinnova.com";
const toTest = ["Admin1234!", "admin1234", "Admin1234", "tekoga123", "Tekoga123!"];

const u = await p.usuario.findUnique({
  where: { email },
  select: { password: true, activo: true },
});

if (!u) {
  console.log("USUARIO NO ENCONTRADO");
} else {
  console.log("activo:", u.activo);
  for (const pwd of toTest) {
    const ok = await bcrypt.compare(pwd, u.password);
    console.log(`  "${pwd}" → ${ok ? "CORRECTA ✓" : "incorrecta"}`);
  }
}

await p.$disconnect();
