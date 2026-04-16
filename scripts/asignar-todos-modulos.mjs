/**
 * Asigna TODOS los módulos del sistema a un usuario USUARIO.
 * Uso: node scripts/asignar-todos-modulos.mjs <email>
 *
 * Ejemplo:
 *   node scripts/asignar-todos-modulos.mjs creivajr@gmail.com
 */
import { createRequire } from "module";
const require = createRequire(import.meta.url);
const { PrismaClient } = require("@prisma/client");
const { PrismaPg } = require("@prisma/adapter-pg");
const { config } = require("dotenv");
config();

const TODOS_LOS_MODULOS = [
  "PROYECTO",
  "PRESUPUESTO",
  "CRONOGRAMA",
  "FINANCIERO",
  "MANO_OBRA",
  "LOGISTICA",
  "COMPRAS",
  "INVENTARIO",
  "BITACORA",
  "REPORTES",
  "ESTADISTICAS",
];

const email = process.argv[2];
if (!email) {
  console.error("❌ Uso: node scripts/asignar-todos-modulos.mjs <email>");
  process.exit(1);
}

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

const usuario = await prisma.usuario.findUnique({
  where: { email },
  select: { id: true, nombre: true, apellido: true, rol: true, permisos: { select: { modulo: true } } },
});

if (!usuario) {
  console.error(`❌ No se encontró ningún usuario con email: ${email}`);
  await prisma.$disconnect();
  process.exit(1);
}

console.log(`\n👤 Usuario: ${usuario.nombre} ${usuario.apellido} (${email}) — Rol: ${usuario.rol}`);
console.log(`📦 Permisos actuales: ${usuario.permisos.map((p) => p.modulo).join(", ") || "ninguno"}`);

// Eliminar todos los permisos existentes y volver a asignar todos
await prisma.permisoModulo.deleteMany({ where: { usuarioId: usuario.id } });

await prisma.permisoModulo.createMany({
  data: TODOS_LOS_MODULOS.map((modulo) => ({
    usuarioId: usuario.id,
    modulo,
  })),
  skipDuplicates: true,
});

console.log(`\n✅ Asignados ${TODOS_LOS_MODULOS.length} módulos al usuario:`);
TODOS_LOS_MODULOS.forEach((m) => console.log(`   • ${m}`));
console.log("\n⚠️  El usuario debe cerrar sesión y volver a ingresar para que los cambios surtan efecto.\n");

await prisma.$disconnect();
