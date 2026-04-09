import { createRequire } from "module";
const require = createRequire(import.meta.url);
const { PrismaClient } = require("@prisma/client");
const { PrismaPg } = require("@prisma/adapter-pg");
const { config } = require("dotenv");
config();

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

// Asignar todos los usuarios sin empresa a la primera empresa disponible
const empresa = await prisma.empresa.findFirst();
if (!empresa) {
  console.error("No hay empresas en la DB. Creá una primero.");
  await prisma.$disconnect();
  process.exit(1);
}

const result = await prisma.usuario.updateMany({
  where: { empresaId: null },
  data: { empresaId: empresa.id },
});

console.log(`✓ Asignados ${result.count} usuario(s) a la empresa "${empresa.nombre}" (${empresa.id})`);
await prisma.$disconnect();
