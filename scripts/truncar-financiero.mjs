import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import * as dotenv from "dotenv";

dotenv.config();

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

const del = await prisma.movimientoFinanciero.deleteMany({});
console.log(`Borrados: ${del.count} movimientos financieros`);

await prisma.$disconnect();
