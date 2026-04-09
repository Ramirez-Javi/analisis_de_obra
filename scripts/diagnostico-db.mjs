import { createRequire } from "module";
const require = createRequire(import.meta.url);
const { PrismaClient } = require("@prisma/client");
const { PrismaPg } = require("@prisma/adapter-pg");
const { config } = require("dotenv");
config();

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

const users = await prisma.usuario.findMany({
  select: { id: true, email: true, rol: true, empresaId: true },
});
console.log("USUARIOS:", JSON.stringify(users, null, 2));

const empresas = await prisma.empresa.findMany({
  select: { id: true, nombre: true },
});
console.log("EMPRESAS:", JSON.stringify(empresas, null, 2));

await prisma.$disconnect();
