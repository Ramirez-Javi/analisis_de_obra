import { createRequire } from "module";
const require = createRequire(import.meta.url);
const { PrismaClient } = require("@prisma/client");
const { PrismaPg } = require("@prisma/adapter-pg");
const { config } = require("dotenv");
config();

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

const ID = "cmnssumjw0000o8u0t67npmpm";

const proyecto = await prisma.proyecto.findUnique({ where: { id: ID }, select: { nombre: true, codigo: true } });
if (!proyecto) { console.log("Proyecto no encontrado."); process.exit(0); }

console.log(`Eliminando: ${proyecto.nombre} (${proyecto.codigo}) ...`);

await prisma.proyecto.delete({ where: { id: ID } });

console.log("Proyecto eliminado correctamente.");
await prisma.$disconnect();
