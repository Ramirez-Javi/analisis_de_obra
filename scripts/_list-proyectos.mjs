import { createRequire } from "module";
const require = createRequire(import.meta.url);
const { PrismaClient } = require("@prisma/client");
const { PrismaPg } = require("@prisma/adapter-pg");
const { config } = require("dotenv");
config();

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

const rows = await prisma.proyecto.findMany({
  select: { id: true, nombre: true, codigo: true, estado: true },
  orderBy: { createdAt: 'desc' }
});
console.log(JSON.stringify(rows, null, 2));
await prisma.$disconnect();
