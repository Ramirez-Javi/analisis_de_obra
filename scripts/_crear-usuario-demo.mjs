/**
 * Crea el usuario demo de TEKOGA para presentaciones con clientes.
 * Email:    demo@tekova.com.py
 * Password: TekDemo2026
 *
 * Uso: node scripts/_crear-usuario-demo.mjs
 */

import { createRequire } from "module";
const require = createRequire(import.meta.url);
const { PrismaClient } = require("@prisma/client");
const { PrismaPg } = require("@prisma/adapter-pg");
const bcrypt = require("bcryptjs");
const { config } = require("dotenv");
config();

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

const EMAIL    = "demo@tekova.com.py";
const PASSWORD = "TekDemo2026";

const empresa = await prisma.empresa.findFirst({ where: { nombre: "TEKOGA" } });
if (!empresa) {
  console.error("❌  Empresa TEKOGA no encontrada. Ejecutá seed-demo.mjs primero.");
  process.exit(1);
}

// Verificar si ya existe
const existe = await prisma.usuario.findUnique({ where: { email: EMAIL } });
if (existe) {
  console.log("ℹ️   El usuario demo ya existe:", EMAIL);
  await prisma.$disconnect();
  process.exit(0);
}

const hash = await bcrypt.hash(PASSWORD, 12);

const usuario = await prisma.usuario.create({
  data: {
    email:     EMAIL,
    nombre:    "Demo",
    apellido:  "TEKOGA",
    password:  hash,
    rol:       "USUARIO",
    activo:    true,
    empresaId: empresa.id,
    // Dar acceso a todos los módulos del sistema
    permisos: {
      create: [
        { modulo: "PROYECTO"         },
        { modulo: "PRESUPUESTO"      },
        { modulo: "CRONOGRAMA"       },
        { modulo: "MANO_OBRA"        },
        { modulo: "LOGISTICA"        },
        { modulo: "FINANCIERO"       },
        { modulo: "REPORTES"         },
        { modulo: "COMPRAS"          },
        { modulo: "INVENTARIO"       },
        { modulo: "BITACORA"         },
        { modulo: "ESTADISTICAS"     },
      ],
    },
  },
});

console.log("\n╔══════════════════════════════════════════╗");
console.log("║   ✅  Usuario demo creado                 ║");
console.log("╠══════════════════════════════════════════╣");
console.log(`║  Email:    ${EMAIL.padEnd(31)}║`);
console.log(`║  Password: ${PASSWORD.padEnd(31)}║`);
console.log(`║  Empresa:  TEKOGA                        ║`);
console.log(`║  Rol:      USUARIO (todos los módulos)   ║`);
console.log("╚══════════════════════════════════════════╝\n");

await prisma.$disconnect();
