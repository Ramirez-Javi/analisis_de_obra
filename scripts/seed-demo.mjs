/**
 * SEED DE DEMO — RESIDENCIA SAN MARTÍN
 * Empresa: TEKOGA — Construcción & Ingeniería
 * Proyecto: ~75% de avance, todos los módulos poblados
 *
 * Uso: node scripts/seed-demo.mjs
 */

import { createRequire } from "module";
const require = createRequire(import.meta.url);
const { PrismaClient } = require("@prisma/client");
const { PrismaPg } = require("@prisma/adapter-pg");
const { config } = require("dotenv");
config();

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

// ─────────────────────────────────────────────
// FECHAS BASE
// ─────────────────────────────────────────────
const INICIO = new Date("2025-10-01");
// ~75% de 280 días = 210 días transcurridos → 3 abr 2026
const HOY = new Date("2026-04-03");
const d = (dias) => {
  const f = new Date(INICIO);
  f.setDate(f.getDate() + dias - 1);
  return f;
};
const hs = (fecha, hora) => {
  const [h, m] = hora.split(":").map(Number);
  const f = new Date(fecha);
  f.setHours(h, m, 0, 0);
  return f;
};

// ─────────────────────────────────────────────
// MAIN
// ─────────────────────────────────────────────
async function main() {
  console.log("🌱  Iniciando seed demo RESIDENCIA SAN MARTÍN …\n");

  // ╔══════════════════════════════════════════╗
  // ║  1. EMPRESA                              ║
  // ╚══════════════════════════════════════════╝
  let empresa = await prisma.empresa.findFirst({
    where: { nombre: "TEKOGA" },
  });
  if (!empresa) {
    empresa = await prisma.empresa.create({
      data: {
        nombre: "TEKOGA",
        titulo: "Construcción & Ingeniería",
        direccion: "Dr. Montero 1450, Asunción",
        telefono: "0981 550 220",
        email: "info@tekova.com.py",
        web: "www.tekova.com.py",
        ciudad: "Asunción",
        pais: "Paraguay",
      },
    });
    console.log("✅  Empresa creada:", empresa.nombre);
  } else {
    console.log("ℹ️   Empresa ya existe:", empresa.nombre);
  }

  // ╔══════════════════════════════════════════╗
  // ║  2. DATOS MAESTROS (unidades, cats, mat) ║
  // ╚══════════════════════════════════════════╝
  // Unidades de medida
  const uUnd = await upsertUnidad("u", "u");
  const uM2  = await upsertUnidad("m²", "m²");
  const uM3  = await upsertUnidad("m³", "m³");
  const uKg  = await upsertUnidad("kg", "kg");
  const uMl  = await upsertUnidad("ml", "ml");
  const uGl  = await upsertUnidad("gl", "gl");
  const uBls = await upsertUnidad("bolsa", "bls");
  console.log("✅  Unidades de medida listas");

  // Categorías de materiales
  const catCem  = await upsertCatMat("Cementicio");
  const catAgre = await upsertCatMat("Áridos y Pétreos");
  const catMam  = await upsertCatMat("Mampostería");
  const catAce  = await upsertCatMat("Acero y Metal");
  const catCub  = await upsertCatMat("Cubierta y Impermeabilización");
  const catRev  = await upsertCatMat("Revoques y Terminaciones");
  const catInst = await upsertCatMat("Instalaciones");
  const catPis  = await upsertCatMat("Pisos y Revestimientos");
  console.log("✅  Categorías materiales listas");

  // Materiales maestros
  const matCemento   = await upsertMat("CEM-001", "Cemento Portland 50 kg",    catCem.id,  uBls.id, 72000);
  const matArena     = await upsertMat("AGR-001", "Arena lavada de río",        catAgre.id, uM3.id,  185000);
  const matPiedra    = await upsertMat("AGR-002", "Piedra triturada 4ta",       catAgre.id, uM3.id,  220000);
  const matLadrillo  = await upsertMat("MAM-001", "Ladrillo común 6-huecos",    catMam.id,  uUnd.id, 1800);
  const matAceroF12  = await upsertMat("ACE-001", "Hierro corrugado Ø12mm",     catAce.id,  uKg.id,  8500);
  const matAceroF8   = await upsertMat("ACE-002", "Hierro corrugado Ø8mm",      catAce.id,  uKg.id,  8500);
  const matTejaFib   = await upsertMat("CUB-001", "Teja fibrocemento colonial",  catCub.id,  uUnd.id, 14500);
  const matMembrana  = await upsertMat("CUB-002", "Membrana asfáltica 4mm",     catCub.id,  uM2.id,  65000);
  const matRevFino   = await upsertMat("REV-001", "Revoque fino interior",       catRev.id,  uKg.id,  4200);
  const matPintura   = await upsertMat("REV-002", "Pintura látex interior",      catRev.id,  uGl.id,  180000);
  const matCañoPVC   = await upsertMat("INS-001", "Caño PVC Ø110mm",            catInst.id, uMl.id,  38000);
  const matCableElec = await upsertMat("INS-002", "Cable NYY 2x2.5mm²",         catInst.id, uMl.id,  12000);
  const matCeramica  = await upsertMat("PIS-001", "Cerámica 45×45 beige",        catPis.id,  uM2.id,  145000);
  const matPorcel    = await upsertMat("PIS-002", "Porcellanato 60×60 gris",     catPis.id,  uM2.id,  265000);
  console.log("✅  Materiales maestros listos");

  // Categorías de rubros
  const catRubMov = await upsertCatRub("Movimiento de Suelos", 1);
  const catRubEst = await upsertCatRub("Estructura",           2);
  const catRubMam = await upsertCatRub("Mampostería",          3);
  const catRubCub = await upsertCatRub("Cubierta",             4);
  const catRubInst= await upsertCatRub("Instalaciones",        5);
  const catRubRev = await upsertCatRub("Revoques",             6);
  const catRubPis = await upsertCatRub("Pisos y Terminaciones",7);
  console.log("✅  Categorías rubros listas");

  // Rubros maestros
  const rmExcav  = await upsertRubroMaestro("RUB-001","Excavación y relleno compactado",      catRubMov.id, uM3.id);
  const rmFund   = await upsertRubroMaestro("RUB-002","Fundación corrida H°A° (zap. + viga)", catRubEst.id, uMl.id);
  const rmLosa   = await upsertRubroMaestro("RUB-003","Losa maciza e=0.15m",                  catRubEst.id, uM2.id);
  const rmColumn = await upsertRubroMaestro("RUB-004","Columna H°A° 25×25 cm",                catRubEst.id, uMl.id);
  const rmMamp   = await upsertRubroMaestro("RUB-005","Mampostería de ladrillo de 6 huecos",  catRubMam.id, uM2.id);
  const rmCubierta=await upsertRubroMaestro("RUB-006","Cubierta teja fibrocemento colonial",  catRubCub.id, uM2.id);
  const rmInst   = await upsertRubroMaestro("RUB-007","Instalación sanitaria y eléctrica",    catRubInst.id,uGl.id);
  const rmRev    = await upsertRubroMaestro("RUB-008","Revoque fino + pintura interior",       catRubRev.id, uM2.id);
  const rmPisos  = await upsertRubroMaestro("RUB-009","Colocación cerámica / porcellanato",   catRubPis.id, uM2.id);
  console.log("✅  Rubros maestros listos");

  // ╔══════════════════════════════════════════╗
  // ║  3. PROYECTO                             ║
  // ╚══════════════════════════════════════════╝
  const inicioContractual = new Date("2025-10-01");
  const finContractual    = new Date("2026-06-07"); // 40 semanas

  const proyecto = await prisma.proyecto.create({
    data: {
      codigo:          "PRY-2026-001",
      nombre:          "RESIDENCIA SAN MARTÍN",
      descripcion:     "Vivienda unifamiliar de 280 m² – planta baja + planta alta. Acabados de nivel medio-alto. Cliente: Familia Martínez-Duarte.",
      ubicacion:       "Av. San Martín 2890 esq. Tte. Espínola, Fernando de la Mora, Paraguay",
      superficieM2:    280,
      superficieTerreno: 600,
      fechaInicio:     inicioContractual,
      fechaFinEstimada:finContractual,
      duracionSemanas: 40,
      estado:          "EN_EJECUCION",
      formaPago:       "Anticipo 30% + 4 cuotas por hito de avance",
      objetoContrato:  "Construcción completa de vivienda unifamiliar de dos plantas, incluye instalaciones sanitarias, eléctricas y terminaciones.",
      fechaContrato:   new Date("2025-09-20"),
      responsableObra: "Arq. Pedro Solís",
      contactoPropietario: "0981 770 441",
      empresaId:       empresa.id,
    },
  });
  console.log("✅  Proyecto creado:", proyecto.nombre, `[${proyecto.id}]`);

  // ╔══════════════════════════════════════════╗
  // ║  4. PROPIETARIOS                         ║
  // ╚══════════════════════════════════════════╝
  await prisma.propietario.createMany({
    data: [
      {
        nombre: "Carlos Alberto", apellido: "Martínez Domínguez",
        dni: "2.345.678", telefono: "0981 770 441",
        email: "ca.martinez@gmail.com", porcentaje: 50, proyectoId: proyecto.id,
      },
      {
        nombre: "María Elena", apellido: "Duarte de Martínez",
        dni: "3.456.789", telefono: "0982 660 330",
        email: "me.duarte@gmail.com", porcentaje: 50, proyectoId: proyecto.id,
      },
    ],
  });
  console.log("✅  Propietarios creados");

  // ╔══════════════════════════════════════════╗
  // ║  5. EQUIPO TÉCNICO                       ║
  // ╚══════════════════════════════════════════╝
  await prisma.miembroEquipo.createMany({
    data: [
      {
        nombre: "Pedro", apellido: "Solís Ramírez",
        rol: "DIRECTOR_OBRA", titulo: "Director de Obra",
        telefono: "0981 220 110", email: "pedro.solis@tekova.com.py",
        matricula: "ARQ-3214", proyectoId: proyecto.id,
      },
      {
        nombre: "Lucía", apellido: "Benítez Cáceres",
        rol: "ARQUITECTO", titulo: "Arq.",
        telefono: "0982 330 551", email: "lucia.benitez@tekova.com.py",
        matricula: "ARQ-4012", proyectoId: proyecto.id,
      },
      {
        nombre: "Rodrigo", apellido: "Torres Vera",
        rol: "INGENIERO_ESTRUCTURAL", titulo: "Ing. Civil",
        telefono: "0971 440 220", email: "rodrigo.torres@tekova.com.py",
        matricula: "ING-1876", proyectoId: proyecto.id,
      },
      {
        nombre: "Santos", apellido: "Aquino Giménez",
        rol: "MAESTRO_MAYOR", titulo: "Maestro Mayor",
        telefono: "0985 550 881", proyectoId: proyecto.id,
      },
    ],
  });
  console.log("✅  Equipo técnico creado");

  // ╔══════════════════════════════════════════╗
  // ║  6. LÁMINAS DE PLANOS                    ║
  // ╚══════════════════════════════════════════╝
  await prisma.laminaPlano.createMany({
    data: [
      { codigo:"A-01", titulo:"Planta Baja – Distribución",        disciplina:"Arquitectura",   revision:"2", proyectoId: proyecto.id },
      { codigo:"A-02", titulo:"Planta Alta – Distribución",        disciplina:"Arquitectura",   revision:"2", proyectoId: proyecto.id },
      { codigo:"A-03", titulo:"Cortes y Elevaciones",              disciplina:"Arquitectura",   revision:"1", proyectoId: proyecto.id },
      { codigo:"A-04", titulo:"Detalles constructivos generales",  disciplina:"Arquitectura",   revision:"1", proyectoId: proyecto.id },
      { codigo:"E-01", titulo:"Fundaciones y vigas de encadenado", disciplina:"Estructura",     revision:"2", proyectoId: proyecto.id },
      { codigo:"E-02", titulo:"Losa planta alta e=0.15m",          disciplina:"Estructura",     revision:"1", proyectoId: proyecto.id },
      { codigo:"E-03", titulo:"Planilla de columnas y vigas",      disciplina:"Estructura",     revision:"1", proyectoId: proyecto.id },
      { codigo:"I-01", titulo:"Instalación sanitaria general",     disciplina:"Instalaciones",  revision:"1", proyectoId: proyecto.id },
      { codigo:"I-02", titulo:"Instalación eléctrica general",     disciplina:"Instalaciones",  revision:"1", proyectoId: proyecto.id },
    ],
  });
  console.log("✅  Láminas de planos creadas");

  // ╔══════════════════════════════════════════╗
  // ║  7. APROBACIÓN DEL PROYECTO              ║
  // ╚══════════════════════════════════════════╝
  await prisma.aprobacionProyecto.create({
    data: {
      proyectoId:              proyecto.id,
      fechaInicioContractual:  inicioContractual,
      fechaFinContractual:     finContractual,
      plazoEnDias:             280,
      montoContratoGs:         1_920_000_000,
      fechaAprobacionPlanos:   new Date("2025-09-15"),
      firmanteAprobacionPlanos:"Carlos A. Martínez",
      obsAprobacionPlanos:     "Planos aprobados con observación menor en baño suite. Rev. 2 incorpora corrección.",
      fechaAprobacionPres:     new Date("2025-09-18"),
      firmanteAprobacionPres:  "Carlos A. Martínez",
      obsAprobacionPres:       "Presupuesto aceptado sin modificaciones.",
      aprobadoPor:             "Carlos A. Martínez – Propietario",
      revisorNombre:           "Rodrigo Torres Vera",
      revisorProfesion:        "Ing. Civil",
      fechaRevision:           new Date("2025-09-22"),
      obsRevision:             "Revisión estructural conforme. Se emite certificado de aptitud.",
      respPresupuesto:         "Pedro Solís Ramírez",
      respPresupuestoProfesion:"Arq. Director de Obra",
    },
  });
  console.log("✅  Aprobación del proyecto creada");

  // ╔══════════════════════════════════════════╗
  // ║  8. RUBROS DEL PROYECTO + INSUMOS        ║
  // ╚══════════════════════════════════════════╝
  // Rubros: [maestroId, orden, cantidad, porcImp, porcGan]
  // Precios en Gs paraguayos

  const rp = {};

  // RUB-001 Excavación y relleno — 180 m³
  rp.excav = await prisma.rubroProyecto.create({
    data: {
      orden:1, cantidad:180, porcImprevistos:5, porcGanancia:12,
      rubroMaestroId: rmExcav.id, proyectoId: proyecto.id,
      insumos: { create: [
        { nombre:"Arena lavada de río",      cantidad:0.3, porcPerdida:8,  precioUnitario:185000, unidadMedidaId:uM3.id },
        { nombre:"Combustible Retroexcavadora", cantidad:8, porcPerdida:0, precioUnitario:12000,  unidadMedidaId:uMl.id, esManodeObra:false },
        { nombre:"Mano de obra excavación",  cantidad:1,  porcPerdida:0,  precioUnitario:55000,  esManodeObra:true, descripcionMO:"Albañil + 2 peones" },
      ]},
    },
  });

  // RUB-002 Fundación corrida — 120 ml
  rp.fund = await prisma.rubroProyecto.create({
    data: {
      orden:2, cantidad:120, porcImprevistos:5, porcGanancia:12,
      rubroMaestroId: rmFund.id, proyectoId: proyecto.id,
      insumos: { create: [
        { nombre:"Cemento Portland 50kg",   cantidad:6,   porcPerdida:5,  precioUnitario:72000,  unidadMedidaId:uBls.id },
        { nombre:"Arena lavada de río",     cantidad:0.9, porcPerdida:8,  precioUnitario:185000, unidadMedidaId:uM3.id  },
        { nombre:"Piedra triturada 4ta",    cantidad:1.2, porcPerdida:5,  precioUnitario:220000, unidadMedidaId:uM3.id  },
        { nombre:"Hierro corrugado Ø12mm",  cantidad:35,  porcPerdida:3,  precioUnitario:8500,   unidadMedidaId:uKg.id  },
        { nombre:"Hierro corrugado Ø8mm",   cantidad:12,  porcPerdida:3,  precioUnitario:8500,   unidadMedidaId:uKg.id  },
        { nombre:"Mano de obra fundación",  cantidad:1,   porcPerdida:0,  precioUnitario:145000, esManodeObra:true, descripcionMO:"Oficial + 3 ayudantes" },
      ]},
    },
  });

  // RUB-003 Losa maciza — 140 m²
  rp.losa = await prisma.rubroProyecto.create({
    data: {
      orden:3, cantidad:140, porcImprevistos:5, porcGanancia:12,
      rubroMaestroId: rmLosa.id, proyectoId: proyecto.id,
      insumos: { create: [
        { nombre:"Cemento Portland 50kg",  cantidad:8,   porcPerdida:5,  precioUnitario:72000,  unidadMedidaId:uBls.id },
        { nombre:"Arena lavada de río",    cantidad:1.1, porcPerdida:8,  precioUnitario:185000, unidadMedidaId:uM3.id  },
        { nombre:"Piedra triturada 4ta",   cantidad:1.4, porcPerdida:5,  precioUnitario:220000, unidadMedidaId:uM3.id  },
        { nombre:"Hierro corrugado Ø12mm", cantidad:28,  porcPerdida:3,  precioUnitario:8500,   unidadMedidaId:uKg.id  },
        { nombre:"Hierro corrugado Ø8mm",  cantidad:18,  porcPerdida:3,  precioUnitario:8500,   unidadMedidaId:uKg.id  },
        { nombre:"Mano de obra losa",      cantidad:1,   porcPerdida:0,  precioUnitario:185000, esManodeObra:true, descripcionMO:"Oficial + 4 ayudantes" },
      ]},
    },
  });

  // RUB-004 Columnas H°A° — 85 ml
  rp.cols = await prisma.rubroProyecto.create({
    data: {
      orden:4, cantidad:85, porcImprevistos:5, porcGanancia:12,
      rubroMaestroId: rmColumn.id, proyectoId: proyecto.id,
      insumos: { create: [
        { nombre:"Cemento Portland 50kg",  cantidad:5,  porcPerdida:5,  precioUnitario:72000,  unidadMedidaId:uBls.id },
        { nombre:"Arena lavada de río",    cantidad:0.7,porcPerdida:8,  precioUnitario:185000, unidadMedidaId:uM3.id  },
        { nombre:"Piedra triturada 4ta",   cantidad:0.9,porcPerdida:5,  precioUnitario:220000, unidadMedidaId:uM3.id  },
        { nombre:"Hierro corrugado Ø12mm", cantidad:42, porcPerdida:3,  precioUnitario:8500,   unidadMedidaId:uKg.id  },
        { nombre:"Hierro corrugado Ø8mm",  cantidad:22, porcPerdida:3,  precioUnitario:8500,   unidadMedidaId:uKg.id  },
        { nombre:"Mano de obra columnas",  cantidad:1,  porcPerdida:0,  precioUnitario:160000, esManodeObra:true, descripcionMO:"Oficial + 2 ayudantes" },
      ]},
    },
  });

  // RUB-005 Mampostería ladrillo — 620 m²
  rp.mamp = await prisma.rubroProyecto.create({
    data: {
      orden:5, cantidad:620, porcImprevistos:5, porcGanancia:12,
      rubroMaestroId: rmMamp.id, proyectoId: proyecto.id,
      insumos: { create: [
        { nombre:"Ladrillo común 6-huecos",   cantidad:55,  porcPerdida:5,  precioUnitario:1800,   unidadMedidaId:uUnd.id },
        { nombre:"Cemento Portland 50kg",     cantidad:0.8, porcPerdida:5,  precioUnitario:72000,  unidadMedidaId:uBls.id },
        { nombre:"Arena lavada de río",       cantidad:0.15,porcPerdida:8,  precioUnitario:185000, unidadMedidaId:uM3.id  },
        { nombre:"Mano de obra mampostería",  cantidad:1,   porcPerdida:0,  precioUnitario:75000,  esManodeObra:true, descripcionMO:"Albañil + 2 peones" },
      ]},
    },
  });

  // RUB-006 Cubierta teja fibrocemento — 160 m²
  rp.cubierta = await prisma.rubroProyecto.create({
    data: {
      orden:6, cantidad:160, porcImprevistos:5, porcGanancia:12,
      rubroMaestroId: rmCubierta.id, proyectoId: proyecto.id,
      insumos: { create: [
        { nombre:"Teja fibrocemento colonial",  cantidad:9,  porcPerdida:10, precioUnitario:14500, unidadMedidaId:uUnd.id },
        { nombre:"Membrana asfáltica 4mm",      cantidad:1,  porcPerdida:5,  precioUnitario:65000, unidadMedidaId:uM2.id  },
        { nombre:"Mano de obra cubierta",       cantidad:1,  porcPerdida:0,  precioUnitario:92000, esManodeObra:true, descripcionMO:"Oficial + 2 ayudantes" },
      ]},
    },
  });

  // RUB-007 Instalaciones — 1 gl
  rp.inst = await prisma.rubroProyecto.create({
    data: {
      orden:7, cantidad:1, porcImprevistos:5, porcGanancia:12,
      rubroMaestroId: rmInst.id, proyectoId: proyecto.id,
      insumos: { create: [
        { nombre:"Caño PVC Ø110mm",        cantidad:85,  porcPerdida:5,  precioUnitario:38000, unidadMedidaId:uMl.id  },
        { nombre:"Cable NYY 2x2.5mm²",     cantidad:280, porcPerdida:5,  precioUnitario:12000, unidadMedidaId:uMl.id  },
        { nombre:"Mano de obra plomería",  cantidad:1,   porcPerdida:0,  precioUnitario:4800000, esManodeObra:true, descripcionMO:"Plomero oficial + ayudante" },
        { nombre:"Mano de obra eléctrica", cantidad:1,   porcPerdida:0,  precioUnitario:3600000, esManodeObra:true, descripcionMO:"Electricista + ayudante" },
      ]},
    },
  });

  // RUB-008 Revoques finos + pintura — 480 m²
  rp.rev = await prisma.rubroProyecto.create({
    data: {
      orden:8, cantidad:480, porcImprevistos:5, porcGanancia:12,
      rubroMaestroId: rmRev.id, proyectoId: proyecto.id,
      insumos: { create: [
        { nombre:"Revoque fino interior", cantidad:8,   porcPerdida:10, precioUnitario:4200,   unidadMedidaId:uKg.id },
        { nombre:"Pintura látex interior",cantidad:0.4, porcPerdida:5,  precioUnitario:180000, unidadMedidaId:uGl.id },
        { nombre:"Mano de obra revoques", cantidad:1,   porcPerdida:0,  precioUnitario:62000,  esManodeObra:true, descripcionMO:"Revocador + ayudante" },
      ]},
    },
  });

  // RUB-009 Pisos cerámica/porcel — 280 m²
  rp.pisos = await prisma.rubroProyecto.create({
    data: {
      orden:9, cantidad:280, porcImprevistos:5, porcGanancia:12,
      rubroMaestroId: rmPisos.id, proyectoId: proyecto.id,
      insumos: { create: [
        { nombre:"Cerámica 45×45 beige",     cantidad:0.6, porcPerdida:8,  precioUnitario:145000, unidadMedidaId:uM2.id },
        { nombre:"Porcellanato 60×60 gris",  cantidad:0.4, porcPerdida:8,  precioUnitario:265000, unidadMedidaId:uM2.id },
        { nombre:"Cemento cola",             cantidad:4.5, porcPerdida:5,  precioUnitario:42000,  unidadMedidaId:uKg.id },
        { nombre:"Mano de obra pisos",       cantidad:1,   porcPerdida:0,  precioUnitario:72000,  esManodeObra:true, descripcionMO:"Colocador + ayudante" },
      ]},
    },
  });
  console.log("✅  Rubros del proyecto + insumos creados (9 rubros)");

  // ╔══════════════════════════════════════════╗
  // ║  9. CRONOGRAMA + AVANCES                 ║
  // ╚══════════════════════════════════════════╝
  // Tareas: [rubroProyectoId, nombre, diaInicio, duracionDias]
  // Avance real al día 210 = ~75%
  const tareas = [
    { rp: rp.excav,    nombre:"Excavación y nivelación de terreno",   diaInicio:1,   dur:18,  avance:100 },
    { rp: rp.fund,     nombre:"Fundaciones corridas H°A°",            diaInicio:15,  dur:35,  avance:100 },
    { rp: rp.cols,     nombre:"Columnas y vigas de encadenado t.b.",  diaInicio:45,  dur:40,  avance:100 },
    { rp: rp.losa,     nombre:"Losa planta alta",                     diaInicio:80,  dur:30,  avance:100 },
    { rp: rp.mamp,     nombre:"Mampostería planta baja + planta alta", diaInicio:50,  dur:70,  avance:100 },
    { rp: rp.cubierta, nombre:"Cubierta teja fibrocemento + membrana", diaInicio:130, dur:25,  avance:100 },
    { rp: rp.inst,     nombre:"Instalaciones sanitarias y eléctricas", diaInicio:120, dur:60,  avance:80  },
    { rp: rp.rev,      nombre:"Revoques finos + pintura interior",     diaInicio:175, dur:50,  avance:45  },
    { rp: rp.pisos,    nombre:"Pisos cerámica y porcellanato",         diaInicio:200, dur:40,  avance:20  },
  ];

  for (const t of tareas) {
    const tarea = await prisma.microcicloTarea.create({
      data: {
        nombre:          t.nombre,
        diaInicio:       t.diaInicio,
        duracionDias:    t.dur,
        rubroProyectoId: t.rp.id,
        proyectoId:      proyecto.id,
      },
    });
    // Registros de avance progresivos
    const checkpoints = avanceCheckpoints(t.diaInicio, t.dur, t.avance);
    for (const cp of checkpoints) {
      await prisma.avanceTarea.create({
        data: {
          microcicloTareaId: tarea.id,
          fecha:             cp.fecha,
          porcentajeReal:    cp.pct,
        },
      });
    }
  }
  console.log("✅  Cronograma y avances creados");

  // ╔══════════════════════════════════════════╗
  // ║  10. CONTRATOS MANO DE OBRA              ║
  // ╚══════════════════════════════════════════╝
  const contratoEst = await prisma.contratoManoObra.create({
    data: {
      descripcion:     "Cuadrilla Estructura y Fundaciones",
      jefeCuadrilla:   "Antonio Rodas Paredes",
      montoPactado:    145_000_000,
      porcRetencion:   5,
      estado:          "FINALIZADO",
      fechaInicio:     d(1),
      fechaFinEstimada:d(120),
      proyectoId:      proyecto.id,
      rubrosAsignados: { create: [
        { rubroProyectoId: rp.excav.id },
        { rubroProyectoId: rp.fund.id  },
        { rubroProyectoId: rp.losa.id  },
        { rubroProyectoId: rp.cols.id  },
      ]},
      personal: { create: [
        { nombre:"Antonio", apellido:"Rodas Paredes",  rol:"Oficial Albañil", telefono:"0981 112 334", dni:"1.234.567" },
        { nombre:"Bernardo",apellido:"Leiva Cáceres",  rol:"Oficial",         telefono:"0982 113 445" },
        { nombre:"César",   apellido:"Melgarejo Ávalos",rol:"Medio Oficial",  telefono:"0975 114 556" },
        { nombre:"Dante",   apellido:"Ortiz González", rol:"Peón",            telefono:"0983 115 667" },
        { nombre:"Emilio",  apellido:"Sosa Villalba",   rol:"Peón" },
      ]},
      pagos: { create: [
        { monto:36_250_000, fecha:d(30),  descripcion:"Pago 1/4 — completado excavación y replanteo" },
        { monto:36_250_000, fecha:d(60),  descripcion:"Pago 2/4 — completado fundaciones" },
        { monto:36_250_000, fecha:d(90),  descripcion:"Pago 3/4 — completado columnas planta baja" },
        { monto:29_375_000, fecha:d(125), descripcion:"Pago final con deducción retención 5%" },
      ]},
    },
  });

  const contratoMamp = await prisma.contratoManoObra.create({
    data: {
      descripcion:     "Cuadrilla Mampostería y Cubierta",
      jefeCuadrilla:   "Roberto Benítez Ortega",
      montoPactado:    98_000_000,
      porcRetencion:   5,
      estado:          "FINALIZADO",
      fechaInicio:     d(50),
      fechaFinEstimada:d(165),
      proyectoId:      proyecto.id,
      rubrosAsignados: { create: [
        { rubroProyectoId: rp.mamp.id    },
        { rubroProyectoId: rp.cubierta.id},
      ]},
      personal: { create: [
        { nombre:"Roberto", apellido:"Benítez Ortega",  rol:"Oficial Albañil", telefono:"0985 225 667", dni:"4.567.890" },
        { nombre:"Fabio",   apellido:"Cabrera López",   rol:"Oficial Albañil" },
        { nombre:"German",  apellido:"Duarte Ramírez",  rol:"Medio Oficial"   },
        { nombre:"Héctor",  apellido:"Flores Medina",   rol:"Peón"            },
      ]},
      pagos: { create: [
        { monto:32_666_000, fecha:d(80),  descripcion:"Anticipo mampostería planta baja" },
        { monto:32_666_000, fecha:d(130), descripcion:"Mampostería completa + inicio cubierta" },
        { monto:27_118_000, fecha:d(165), descripcion:"Cubierta terminada — pago final c/retención" },
      ]},
    },
  });

  const contratoTermin = await prisma.contratoManoObra.create({
    data: {
      descripcion:     "Cuadrilla Terminaciones (Revoques, Pisos, Pintura)",
      jefeCuadrilla:   "Ignacio Paredes Acosta",
      montoPactado:    112_000_000,
      porcRetencion:   5,
      estado:          "ACTIVO",
      fechaInicio:     d(170),
      fechaFinEstimada:d(260),
      proyectoId:      proyecto.id,
      rubrosAsignados: { create: [
        { rubroProyectoId: rp.rev.id   },
        { rubroProyectoId: rp.pisos.id },
      ]},
      personal: { create: [
        { nombre:"Ignacio",  apellido:"Paredes Acosta",  rol:"Revocador Oficial", telefono:"0984 336 778", dni:"5.678.901" },
        { nombre:"Juan",     apellido:"Quispe Vargas",   rol:"Revocador Oficial" },
        { nombre:"Kevin",    apellido:"Romero Ibáñez",   rol:"Colocador Pisos"   },
        { nombre:"Leonardo", apellido:"Salinas Pinto",   rol:"Peón"              },
      ]},
      pagos: { create: [
        { monto:30_000_000, fecha:d(185), descripcion:"Anticipo revoques planta baja" },
        { monto:30_000_000, fecha:d(205), descripcion:"Revoques planta baja terminados" },
      ]},
    },
  });

  // Contrato instalaciones (electricista + plomero)
  const contratoInst = await prisma.contratoManoObra.create({
    data: {
      descripcion:     "Cuadrilla Instalaciones (Sanitaria + Eléctrica)",
      jefeCuadrilla:   "Mario Vera Sánchez",
      montoPactado:    85_000_000,
      porcRetencion:   5,
      estado:          "ACTIVO",
      fechaInicio:     d(120),
      fechaFinEstimada:d(195),
      proyectoId:      proyecto.id,
      rubrosAsignados: { create: [
        { rubroProyectoId: rp.inst.id },
      ]},
      personal: { create: [
        { nombre:"Mario",   apellido:"Vera Sánchez",    rol:"Plomero Oficial",    telefono:"0983 447 889", dni:"6.789.012" },
        { nombre:"Néstor",  apellido:"Torres Amarilla",  rol:"Electricista Oficial" },
        { nombre:"Orlando", apellido:"Gaona Benítez",    rol:"Ayudante"           },
      ]},
      pagos: { create: [
        { monto:28_333_000, fecha:d(135), descripcion:"Anticipo — roughing sanitario planta baja" },
        { monto:28_333_000, fecha:d(170), descripcion:"Instalación eléctrica planta baja completa" },
      ]},
    },
  });
  console.log("✅  Contratos de mano de obra creados (4 contratos)");

  // ╔══════════════════════════════════════════╗
  // ║  11. COSTOS INDIRECTOS                   ║
  // ╚══════════════════════════════════════════╝
  await prisma.costoIndirecto.createMany({
    data: [
      { descripcion:"Alquiler retroexcavadora Caterpillar 420F (5 días)",  tipo:"ALQUILER_MAQUINARIA", monto:3_500_000,  fecha:d(3),   proveedor:"MAQUINARIAS DEL PARAGUAY S.A.", comprobante:"FAC-001-00421", proyectoId:proyecto.id },
      { descripcion:"Alquiler hormigonera 250 L (70 días)",                tipo:"ALQUILER_MAQUINARIA", monto:5_600_000,  fecha:d(15),  proveedor:"AGROFERRO S.R.L.",             comprobante:"FAC-002-00187", proyectoId:proyecto.id },
      { descripcion:"Alquiler andamio tubular (60 días)",                  tipo:"ALQUILER_MAQUINARIA", monto:2_400_000,  fecha:d(50),  proveedor:"ANDAMIOS COOP S.A.",           comprobante:"FAC-003-00094", proyectoId:proyecto.id },
      { descripcion:"Flete arena y piedra — primera entrega",              tipo:"FLETE",               monto:1_200_000,  fecha:d(12),  proveedor:"TRANSPORTE ZÁRATE S.A.",       comprobante:"REM-001-00312", proyectoId:proyecto.id },
      { descripcion:"Flete ladrillos — primera entrega 8.000 u",          tipo:"FLETE",               monto:850_000,    fecha:d(48),  proveedor:"TRANSPORTE ZÁRATE S.A.",       comprobante:"REM-001-00395", proyectoId:proyecto.id },
      { descripcion:"Flete materiales terminaciones",                      tipo:"FLETE",               monto:720_000,    fecha:d(175), proveedor:"TRANSPORTE ZÁRATE S.A.",       comprobante:"REM-001-00461", proyectoId:proyecto.id },
      { descripcion:"Honorarios Arq. Lucía Benítez — Dirección Diseño",   tipo:"HONORARIOS_PROYECTO", monto:9_600_000,  fecha:d(1),   proveedor:"Lucía Benítez Cáceres",        proyectoId:proyecto.id },
      { descripcion:"Honorarios Ing. Rodrigo Torres — Cálculo Estructural",tipo:"HONORARIOS_PROYECTO", monto:12_000_000, fecha:d(1),   proveedor:"Rodrigo Torres Vera",          proyectoId:proyecto.id },
      { descripcion:"Seguro de obra y responsabilidad civil",              tipo:"SEGURO",              monto:4_800_000,  fecha:d(1),   proveedor:"MAPFRE Paraguay",              comprobante:"POL-2025-87234", proyectoId:proyecto.id },
      { descripcion:"Gastos administrativos Q4-2025",                     tipo:"GASTO_ADMINISTRATIVO",monto:1_500_000,  fecha:d(90),  proyectoId:proyecto.id },
      { descripcion:"Gastos administrativos Q1-2026",                     tipo:"GASTO_ADMINISTRATIVO",monto:1_500_000,  fecha:d(180), proyectoId:proyecto.id },
      { descripcion:"Agua y energía eléctrica de obra",                   tipo:"OTRO",                monto:2_100_000,  fecha:d(90),  proveedor:"ESSAP / ANDE",                 proyectoId:proyecto.id },
    ],
  });
  console.log("✅  Costos indirectos creados (12 registros)");

  // ╔══════════════════════════════════════════╗
  // ║  12. PLAN DE PAGOS + CUOTAS              ║
  // ╚══════════════════════════════════════════╝
  const TOTAL = 1_920_000_000;
  const cuotas = await Promise.all([
    prisma.cuotaPago.create({ data:{ numeroCuota:1, porcentaje:30, descripcion:"Anticipo al inicio de obra (30%)",                    fechaEstimada:d(1),   estado:"PAGADA", fechaPago:d(1),   proyectoId:proyecto.id }}),
    prisma.cuotaPago.create({ data:{ numeroCuota:2, porcentaje:20, descripcion:"Al completar estructura (columnas + losa) (20%)",     fechaEstimada:d(90),  estado:"PAGADA", fechaPago:d(88),  proyectoId:proyecto.id }}),
    prisma.cuotaPago.create({ data:{ numeroCuota:3, porcentaje:20, descripcion:"Al completar mampostería y cubierta (20%)",           fechaEstimada:d(155), estado:"PAGADA", fechaPago:d(160), proyectoId:proyecto.id }}),
    prisma.cuotaPago.create({ data:{ numeroCuota:4, porcentaje:20, descripcion:"Al completar instalaciones y revoques (20%)",        fechaEstimada:d(220), estado:"PENDIENTE",                  proyectoId:proyecto.id }}),
    prisma.cuotaPago.create({ data:{ numeroCuota:5, porcentaje:10, descripcion:"Entrega final de obra al propietario (10%)",         fechaEstimada:d(280), estado:"PENDIENTE",                  proyectoId:proyecto.id }}),
  ]);
  console.log("✅  Plan de pagos creado (5 cuotas)");

  // ╔══════════════════════════════════════════╗
  // ║  13. PROVEEDORES                         ║
  // ╚══════════════════════════════════════════╝
  const provCemento = await prisma.proveedor.create({ data:{
    razonSocial:"CEMENTOS DEL PARAGUAY S.A.", ruc:"80012345-6", tipoPersona:"JURIDICA",
    direccion:"Ruta 2 km 28, Capiatá", emailEmpresa:"ventas@cementosdelpy.com.py",
    contactoNombre:"Miguel Ríos", contactoTelefono:"0981 600 112", contactoEmail:"miguel.rios@cementosdelpy.com.py",
    banco:"BASA", tipoCuenta:"CORRIENTE", numeroCuenta:"001-234567-8",
    vendedores:"Miguel Ríos – Zona Asunción / Fernando de la Mora",
    activo:true, empresaId: empresa.id,
  }});

  const provFerret = await prisma.proveedor.create({ data:{
    razonSocial:"FERRETERÍA CONSTRUMAX S.R.L.", ruc:"80056789-0", tipoPersona:"JURIDICA",
    direccion:"Mariscal Estigarribia 1120, Asunción", emailEmpresa:"cotizaciones@construmax.com.py",
    contactoNombre:"Sandra López", contactoTelefono:"0982 700 334", contactoEmail:"s.lopez@construmax.com.py",
    banco:"Continental", tipoCuenta:"CORRIENTE", numeroCuenta:"002-345678-9",
    activo:true, empresaId: empresa.id,
  }});

  const provLadrillo = await prisma.proveedor.create({ data:{
    razonSocial:"LADRILLERÍA SAN PEDRO S.A.", ruc:"80098765-4", tipoPersona:"JURIDICA",
    direccion:"Ruta 1 km 40, Guarambaré", emailEmpresa:"ventas@ladrilleriasp.com.py",
    contactoNombre:"Jorge Mendoza", contactoTelefono:"0971 800 221",
    activo:true, empresaId: empresa.id,
  }});

  const provPisos = await prisma.proveedor.create({ data:{
    razonSocial:"PORCELANATOS DEL SUR S.A.", ruc:"80011223-5", tipoPersona:"JURIDICA",
    direccion:"Av. Artigas 3400, Luque", emailEmpresa:"info@porcelanatossur.com.py",
    contactoNombre:"Patricia Vera", contactoTelefono:"0984 900 556",
    activo:true, empresaId: empresa.id,
  }});
  console.log("✅  Proveedores creados (4 proveedores)");

  // ╔══════════════════════════════════════════╗
  // ║  14. FACTURAS DE PROVEEDORES             ║
  // ╚══════════════════════════════════════════╝
  const facCem1 = await prisma.facturaProveedor.create({ data:{
    nroFactura:"001-001-0004521", fecha:d(14), concepto:"300 bolsas cemento Portland 50kg",
    monto:21_600_000, montoPagado:21_600_000, estado:"PAGADA",
    proveedorId:provCemento.id, proyectoId:proyecto.id,
  }});
  const facCem2 = await prisma.facturaProveedor.create({ data:{
    nroFactura:"001-001-0004789", fecha:d(75), concepto:"250 bolsas cemento Portland 50kg",
    monto:18_000_000, montoPagado:18_000_000, estado:"PAGADA",
    proveedorId:provCemento.id, proyectoId:proyecto.id,
  }});
  const facFerr1 = await prisma.facturaProveedor.create({ data:{
    nroFactura:"001-002-0008123", fecha:d(12), concepto:"Hierro corrugado Ø12 y Ø8 — primera entrega",
    monto:38_500_000, montoPagado:38_500_000, estado:"PAGADA",
    proveedorId:provFerret.id, proyectoId:proyecto.id,
  }});
  const facFerr2 = await prisma.facturaProveedor.create({ data:{
    nroFactura:"001-002-0008567", fecha:d(118), concepto:"Caño PVC Ø110mm + cables eléctricos NYY + accesorios",
    monto:16_800_000, montoPagado:16_800_000, estado:"PAGADA",
    proveedorId:provFerret.id, proyectoId:proyecto.id,
  }});
  const facFerr3 = await prisma.facturaProveedor.create({ data:{
    nroFactura:"001-002-0009100", fecha:d(174), concepto:"Cerámicas, porcellanato y adhesivo — partida 1",
    monto:22_400_000, montoPagado:0, estado:"PENDIENTE",
    fechaVencimiento:d(204),
    proveedorId:provFerret.id, proyectoId:proyecto.id,
  }});
  const facLadr = await prisma.facturaProveedor.create({ data:{
    nroFactura:"001-003-0001876", fecha:d(47), concepto:"10.000 ladrillos 6-huecos — primer lote",
    monto:18_000_000, montoPagado:18_000_000, estado:"PAGADA",
    proveedorId:provLadrillo.id, proyectoId:proyecto.id,
  }});
  const facPisos = await prisma.facturaProveedor.create({ data:{
    nroFactura:"001-004-0002341", fecha:d(198), concepto:"Porcellanato 60×60 gris + cerámica 45×45 beige",
    monto:31_500_000, montoPagado:0, estado:"PENDIENTE",
    fechaVencimiento:d(228),
    proveedorId:provPisos.id, proyectoId:proyecto.id,
  }});
  console.log("✅  Facturas de proveedores creadas (7 facturas)");

  // ╔══════════════════════════════════════════╗
  // ║  15. MOVIMIENTOS FINANCIEROS             ║
  // ╚══════════════════════════════════════════╝
  // INGRESOS (cobros al cliente)
  const movIngAnticipo = await prisma.movimientoFinanciero.create({ data:{
    fecha:d(1), tipo:"INGRESO_CLIENTE", concepto:"Cobro anticipo 30% — Cuota 1",
    beneficiario:"Carlos A. Martínez / María E. Duarte de Martínez",
    monto: TOTAL * 0.30, metodoPago:"TRANSFERENCIA",
    nroTransaccion:"TRF-2025-10-01-001", bancoTransfer:"BASA",
    tipoComprobante:"RECIBO", nroComprobante:"REC-001-00001",
    cuotaPagoId:cuotas[0].id, proyectoId:proyecto.id,
  }});

  const movIngC2 = await prisma.movimientoFinanciero.create({ data:{
    fecha:d(88), tipo:"INGRESO_CLIENTE", concepto:"Cobro cuota 2 — Al completar estructura",
    beneficiario:"Carlos A. Martínez",
    monto: TOTAL * 0.20, metodoPago:"CHEQUE",
    nroCheque:"00023456", bancoCheque:"BASA",
    fechaEmisionCheque:d(85), fechaCobroCheque:d(90),
    tipoComprobante:"RECIBO", nroComprobante:"REC-001-00002",
    cuotaPagoId:cuotas[1].id, proyectoId:proyecto.id,
  }});

  const movIngC3 = await prisma.movimientoFinanciero.create({ data:{
    fecha:d(160), tipo:"INGRESO_CLIENTE", concepto:"Cobro cuota 3 — Al completar mampostería y cubierta",
    beneficiario:"Carlos A. Martínez",
    monto: TOTAL * 0.20, metodoPago:"TRANSFERENCIA",
    nroTransaccion:"TRF-2026-01-08-001", bancoTransfer:"BASA",
    tipoComprobante:"RECIBO", nroComprobante:"REC-001-00003",
    cuotaPagoId:cuotas[2].id, proyectoId:proyecto.id,
  }});

  // EGRESOS materiales
  await prisma.movimientoFinanciero.create({ data:{
    fecha:d(14), tipo:"EGRESO_PROVEEDOR", concepto:"Pago factura cemento — 300 bolsas",
    beneficiario:"CEMENTOS DEL PARAGUAY S.A.", monto:21_600_000, metodoPago:"TRANSFERENCIA",
    proveedorId:provCemento.id, tipoComprobante:"FACTURA", nroComprobante:"001-001-0004521",
    proyectoId:proyecto.id,
  }});
  await prisma.movimientoFinanciero.create({ data:{
    fecha:d(75), tipo:"EGRESO_PROVEEDOR", concepto:"Pago factura cemento — 250 bolsas",
    beneficiario:"CEMENTOS DEL PARAGUAY S.A.", monto:18_000_000, metodoPago:"TRANSFERENCIA",
    proveedorId:provCemento.id, tipoComprobante:"FACTURA", nroComprobante:"001-001-0004789",
    proyectoId:proyecto.id,
  }});
  await prisma.movimientoFinanciero.create({ data:{
    fecha:d(13), tipo:"EGRESO_PROVEEDOR", concepto:"Pago hierro corrugado — primera entrega",
    beneficiario:"FERRETERÍA CONSTRUMAX S.R.L.", monto:38_500_000, metodoPago:"CHEQUE",
    nroCheque:"00023111", bancoCheque:"BASA",
    proveedorId:provFerret.id, tipoComprobante:"FACTURA", nroComprobante:"001-002-0008123",
    proyectoId:proyecto.id,
  }});
  await prisma.movimientoFinanciero.create({ data:{
    fecha:d(120), tipo:"EGRESO_PROVEEDOR", concepto:"Pago materiales instalaciones — PVC + cables",
    beneficiario:"FERRETERÍA CONSTRUMAX S.R.L.", monto:16_800_000, metodoPago:"EFECTIVO",
    proveedorId:provFerret.id, tipoComprobante:"FACTURA", nroComprobante:"001-002-0008567",
    proyectoId:proyecto.id,
  }});
  await prisma.movimientoFinanciero.create({ data:{
    fecha:d(48), tipo:"EGRESO_PROVEEDOR", concepto:"Pago 10.000 ladrillos primer lote",
    beneficiario:"LADRILLERÍA SAN PEDRO S.A.", monto:18_000_000, metodoPago:"EFECTIVO",
    proveedorId:provLadrillo.id, tipoComprobante:"FACTURA", nroComprobante:"001-003-0001876",
    proyectoId:proyecto.id,
  }});

  // EGRESOS mano de obra (resumen — mismos montos que pagos MO)
  await prisma.movimientoFinanciero.create({ data:{
    fecha:d(125), tipo:"EGRESO_PERSONAL", concepto:"Liquidación final cuadrilla estructura",
    beneficiario:"Cuadrilla Rodas — Estructura y Fundaciones",
    monto:138_125_000, metodoPago:"TRANSFERENCIA",
    contratoManoObraId:contratoEst.id, tipoComprobante:"RECIBO", nroComprobante:"REC-MO-001",
    proyectoId:proyecto.id,
  }});
  await prisma.movimientoFinanciero.create({ data:{
    fecha:d(165), tipo:"EGRESO_PERSONAL", concepto:"Pago final cuadrilla mampostería y cubierta",
    beneficiario:"Cuadrilla Benítez — Mampostería y Cubierta",
    monto:93_100_000, metodoPago:"TRANSFERENCIA",
    contratoManoObraId:contratoMamp.id, tipoComprobante:"RECIBO", nroComprobante:"REC-MO-002",
    proyectoId:proyecto.id,
  }});
  await prisma.movimientoFinanciero.create({ data:{
    fecha:d(205), tipo:"EGRESO_PERSONAL", concepto:"Pago parcial cuadrilla terminaciones",
    beneficiario:"Cuadrilla Paredes — Terminaciones",
    monto:60_000_000, metodoPago:"EFECTIVO",
    contratoManoObraId:contratoTermin.id, tipoComprobante:"RECIBO", nroComprobante:"REC-MO-003",
    proyectoId:proyecto.id,
  }});
  await prisma.movimientoFinanciero.create({ data:{
    fecha:d(170), tipo:"EGRESO_PERSONAL", concepto:"Pago parcial cuadrilla instalaciones",
    beneficiario:"Cuadrilla Vera — Instalaciones",
    monto:56_666_000, metodoPago:"TRANSFERENCIA",
    contratoManoObraId:contratoInst.id, tipoComprobante:"RECIBO", nroComprobante:"REC-MO-004",
    proyectoId:proyecto.id,
  }});

  // EGRESOS maquinaria / logística
  await prisma.movimientoFinanciero.create({ data:{
    fecha:d(3),   tipo:"EGRESO_MAQUINARIA", concepto:"Alquiler retroexcavadora 5 días",
    beneficiario:"MAQUINARIAS DEL PARAGUAY S.A.", monto:3_500_000, metodoPago:"EFECTIVO",
    tipoComprobante:"FACTURA", nroComprobante:"FAC-001-00421", proyectoId:proyecto.id,
  }});
  await prisma.movimientoFinanciero.create({ data:{
    fecha:d(15),  tipo:"EGRESO_MAQUINARIA", concepto:"Alquiler hormigonera 70 días",
    beneficiario:"AGROFERRO S.R.L.", monto:5_600_000, metodoPago:"EFECTIVO",
    tipoComprobante:"FACTURA", nroComprobante:"FAC-002-00187", proyectoId:proyecto.id,
  }});

  // EGRESOS honorarios
  await prisma.movimientoFinanciero.create({ data:{
    fecha:d(1),   tipo:"EGRESO_HONORARIO", concepto:"Honorarios Arq. Lucía Benítez — Diseño",
    beneficiario:"Lucía Benítez Cáceres", monto:9_600_000, metodoPago:"TRANSFERENCIA",
    proyectoId:proyecto.id,
  }});
  await prisma.movimientoFinanciero.create({ data:{
    fecha:d(1),   tipo:"EGRESO_HONORARIO", concepto:"Honorarios Ing. Torres — Cálculo Estructural",
    beneficiario:"Rodrigo Torres Vera", monto:12_000_000, metodoPago:"TRANSFERENCIA",
    proyectoId:proyecto.id,
  }});

  // EGRESOS caja chica
  await prisma.movimientoFinanciero.create({ data:{
    fecha:d(30),  tipo:"EGRESO_CAJA_CHICA", concepto:"Herramientas menores y consumibles",
    beneficiario:"Santos Aquino (Maestro Mayor)", monto:650_000, metodoPago:"EFECTIVO",
    proyectoId:proyecto.id,
  }});
  await prisma.movimientoFinanciero.create({ data:{
    fecha:d(90),  tipo:"EGRESO_CAJA_CHICA", concepto:"Consumibles, clavo, alambre, cinta",
    beneficiario:"Santos Aquino (Maestro Mayor)", monto:480_000, metodoPago:"EFECTIVO",
    proyectoId:proyecto.id,
  }});
  await prisma.movimientoFinanciero.create({ data:{
    fecha:d(170), tipo:"EGRESO_CAJA_CHICA", concepto:"Herramientas menores terminaciones",
    beneficiario:"Ignacio Paredes (Capataz)", monto:390_000, metodoPago:"EFECTIVO",
    proyectoId:proyecto.id,
  }});

  console.log("✅  Movimientos financieros creados");

  // ╔══════════════════════════════════════════╗
  // ║  16. BODEGA — RecepcionBodega + AsBuilt  ║
  // ╚══════════════════════════════════════════╝
  // Ambientes
  const ambientes = await Promise.all([
    prisma.ambienteProyecto.create({ data:{ nombre:"Living-Comedor",       proyectoId:proyecto.id }}),
    prisma.ambienteProyecto.create({ data:{ nombre:"Cocina",               proyectoId:proyecto.id }}),
    prisma.ambienteProyecto.create({ data:{ nombre:"Suite Principal",      proyectoId:proyecto.id }}),
    prisma.ambienteProyecto.create({ data:{ nombre:"Dormitorio 2",         proyectoId:proyecto.id }}),
    prisma.ambienteProyecto.create({ data:{ nombre:"Dormitorio 3",         proyectoId:proyecto.id }}),
    prisma.ambienteProyecto.create({ data:{ nombre:"Baño Suite",           proyectoId:proyecto.id }}),
    prisma.ambienteProyecto.create({ data:{ nombre:"Baño Común",           proyectoId:proyecto.id }}),
    prisma.ambienteProyecto.create({ data:{ nombre:"Garage Doble",         proyectoId:proyecto.id }}),
    prisma.ambienteProyecto.create({ data:{ nombre:"Terraza",              proyectoId:proyecto.id }}),
    prisma.ambienteProyecto.create({ data:{ nombre:"Pasillo / Escalera",   proyectoId:proyecto.id }}),
  ]);
  console.log("✅  Ambientes creados (10 ambientes)");

  // Recepciones de bodega
  const recCem1 = await prisma.recepcionBodega.create({ data:{
    fechaRecepcion:d(14), cantidadRecibida:300, nroRemision:"REM-2025-0312",
    marca:"Vallemí", modeloSKU:"CEM-5025", nroLote:"L-250301",
    responsableReceptor:"Santos Aquino",
    materialId:matCemento.id, proveedorId:provCemento.id, proyectoId:proyecto.id,
  }});
  const recCem2 = await prisma.recepcionBodega.create({ data:{
    fechaRecepcion:d(75), cantidadRecibida:250, nroRemision:"REM-2025-0451",
    marca:"Vallemí", modeloSKU:"CEM-5025", nroLote:"L-250601",
    responsableReceptor:"Santos Aquino",
    materialId:matCemento.id, proveedorId:provCemento.id, proyectoId:proyecto.id,
  }});
  const recArena = await prisma.recepcionBodega.create({ data:{
    fechaRecepcion:d(12), cantidadRecibida:45, nroRemision:"REM-TZ-0312",
    especificacionTecnica:"Arena lavada de río Tebicuary — granulometría fina",
    responsableReceptor:"Santos Aquino",
    materialId:matArena.id, proyectoId:proyecto.id,
  }});
  const recPiedra = await prisma.recepcionBodega.create({ data:{
    fechaRecepcion:d(12), cantidadRecibida:35, nroRemision:"REM-TZ-0313",
    especificacionTecnica:"Piedra triturada 4ta — árido limpio s/barro",
    responsableReceptor:"Santos Aquino",
    materialId:matPiedra.id, proyectoId:proyecto.id,
  }});
  const recLadrillo = await prisma.recepcionBodega.create({ data:{
    fechaRecepcion:d(48), cantidadRecibida:10000, nroRemision:"REM-LP-0047",
    marca:"Ladrillería San Pedro", modeloSKU:"LAD-6H-STAN",
    responsableReceptor:"Santos Aquino",
    materialId:matLadrillo.id, proveedorId:provLadrillo.id, proyectoId:proyecto.id,
  }});
  const recHierroF12 = await prisma.recepcionBodega.create({ data:{
    fechaRecepcion:d(12), cantidadRecibida:3500, nroRemision:"REM-CX-0812",
    marca:"Aceros del Paraguay", modeloSKU:"ACE-C12-6M", nroLote:"H-2025-09",
    responsableReceptor:"Santos Aquino",
    materialId:matAceroF12.id, proveedorId:provFerret.id, proyectoId:proyecto.id,
  }});
  const recHierroF8 = await prisma.recepcionBodega.create({ data:{
    fechaRecepcion:d(12), cantidadRecibida:1800, nroRemision:"REM-CX-0813",
    marca:"Aceros del Paraguay", modeloSKU:"ACE-C8-6M", nroLote:"H-2025-09",
    responsableReceptor:"Santos Aquino",
    materialId:matAceroF8.id, proveedorId:provFerret.id, proyectoId:proyecto.id,
  }});
  const recCeramica = await prisma.recepcionBodega.create({ data:{
    fechaRecepcion:d(198), cantidadRecibida:120, nroRemision:"REM-PS-0341",
    marca:"Franciscan", modeloSKU:"CER-45B-BEIGE", nroLote:"C-2025-12",
    responsableReceptor:"Ignacio Paredes",
    materialId:matCeramica.id, proveedorId:provPisos.id, proyectoId:proyecto.id,
  }});
  const recPorcel = await prisma.recepcionBodega.create({ data:{
    fechaRecepcion:d(198), cantidadRecibida:80, nroRemision:"REM-PS-0342",
    marca:"Portinari", modeloSKU:"PORC-60G-GRIS", nroLote:"P-2026-01",
    responsableReceptor:"Ignacio Paredes",
    materialId:matPorcel.id, proveedorId:provPisos.id, proyectoId:proyecto.id,
  }});
  console.log("✅  Recepciones de bodega creadas (9 entradas)");

  // AsBuilt — solo fundaciones y mampostería ya terminadas
  const [ambLiving, ambCocina, ambSuite, ambDorm2, ambDorm3, ambBanoSuite, ambBanoCom, ambGarage, ambTerraza] = ambientes;
  await prisma.asBuiltRegistro.createMany({
    data:[
      // Fundaciones
      { fechaInstalacion:d(20), cantidadInstalada:280, dosificacionOMezcla:"H°A° 210kg/cm² — relación 1:2:3", mecanismoInstalacion:"Vaciado manual + compactado con vibrador", ambienteId:ambGarage.id,   recepcionId:recCem1.id, rubroProyectoId:rp.fund.id },
      { fechaInstalacion:d(25), cantidadInstalada:350, dosificacionOMezcla:"H°A° 210kg/cm² — relación 1:2:3", mecanismoInstalacion:"Vaciado con hormigonera 250L",               ambienteId:ambLiving.id, recepcionId:recCem1.id, rubroProyectoId:rp.fund.id },
      // Columnas
      { fechaInstalacion:d(55), cantidadInstalada:18,  dosificacionOMezcla:"H°A° 250kg/cm² — relación 1:1.5:3", mecanismoInstalacion:"Encofrado metálico + vibrado",             ambienteId:ambLiving.id, recepcionId:recCem1.id, rubroProyectoId:rp.cols.id },
      { fechaInstalacion:d(70), cantidadInstalada:14,  dosificacionOMezcla:"H°A° 250kg/cm² — relación 1:1.5:3", mecanismoInstalacion:"Encofrado metálico + vibrado",             ambienteId:ambSuite.id,  recepcionId:recCem2.id, rubroProyectoId:rp.cols.id },
      // Mampostería
      { fechaInstalacion:d(60), cantidadInstalada:85,  dosificacionOMezcla:"Mortero 1:5 (cemento:arena)",        mecanismoInstalacion:"Colocación a plomada con hilos guía",     ambienteId:ambLiving.id, recepcionId:recLadrillo.id, rubroProyectoId:rp.mamp.id },
      { fechaInstalacion:d(75), cantidadInstalada:60,  dosificacionOMezcla:"Mortero 1:5 (cemento:arena)",        mecanismoInstalacion:"Colocación a plomada con hilos guía",     ambienteId:ambCocina.id, recepcionId:recLadrillo.id, rubroProyectoId:rp.mamp.id },
      { fechaInstalacion:d(85), cantidadInstalada:90,  dosificacionOMezcla:"Mortero 1:5 (cemento:arena)",        mecanismoInstalacion:"Colocación a plomada con hilos guía",     ambienteId:ambSuite.id,  recepcionId:recLadrillo.id, rubroProyectoId:rp.mamp.id },
      // Pisos (en proceso — solo living)
      { fechaInstalacion:d(202), cantidadInstalada:45, dosificacionOMezcla:"Adhesivo Standard 5kg/m²",           mecanismoInstalacion:"Llana dentada 6mm + jineteo",             ambienteId:ambLiving.id, recepcionId:recCeramica.id, rubroProyectoId:rp.pisos.id },
    ],
  });
  console.log("✅  Registros As-Built creados");

  // ╔══════════════════════════════════════════╗
  // ║  17. BITÁCORA DE OBRA                    ║
  // ╚══════════════════════════════════════════╝
  const entradas = [
    // Octubre 2025 — inicio de obra
    {
      dia:1, clima:"Soleado", temp:28, hora:"07:00", fin:"17:00", turno:"Completo",
      desc:"Inicio oficial de obra. Replanteo topográfico, instalación de obrador provisional y señalización perimetral del terreno.",
      pos:"Inicio en fecha pactada. Topógrafo confirmó nivelación correcta.",
      neg:"Demora de 2h en llegada de materiales para obrador.",
      oport:"Vecino de la esquina ofreció espacio para acopio temporal de áridos.", amenazas:null,
      obs:"Coordinar con municipalidad para corte de acceso el lunes próximo.",
      firma:"Santos Aquino",
      rubros:[{ desc:"Replanteo y señalización", cant:1, unid:"gl", pct:100 }],
      personal:[
        { nombre:"Santos Aquino",    cat:"Maestro Mayor",  hs:8 },
        { nombre:"Antonio Rodas",    cat:"Oficial Albañil", hs:8 },
        { nombre:"Bernardo Leiva",   cat:"Oficial",         hs:8 },
        { nombre:"César Melgarejo",  cat:"Medio Oficial",   hs:8 },
        { nombre:"Dante Ortiz",      cat:"Peón",            hs:8 },
        { nombre:"Emilio Sosa",      cat:"Peón",            hs:8 },
      ],
    },
    {
      dia:5, clima:"Soleado", temp:30, hora:"07:00", fin:"17:00", turno:"Completo",
      desc:"Excavación de cimientos área living-comedor y sector garage. Se alcanzó cota -1.20m en zona central.",
      pos:"Rendimiento de excavación superior al planificado. Suelo firme encontrado a -0.90m.", neg:"Tráfico de camiones bloqueó vía pública por 1h.", oport:null,
      amenazas:"Posibilidad de lluvia para fin de semana — monitorear.",
      obs:"Solicitar habilitación de segunda retroexcavadora para acelerar.", firma:"Santos Aquino",
      rubros:[{ desc:"Excavación cimientos zona central", cant:32, unid:"m³", pct:18 }],
      personal:[
        { nombre:"Santos Aquino",   cat:"Maestro Mayor",  hs:9  },
        { nombre:"Antonio Rodas",   cat:"Oficial Albañil", hs:9 },
        { nombre:"Bernardo Leiva",  cat:"Oficial",         hs:9 },
        { nombre:"Dante Ortiz",     cat:"Peón",            hs:9 },
        { nombre:"Emilio Sosa",     cat:"Peón",            hs:9 },
      ],
    },
    {
      dia:15, clima:"Parcialmente nublado", temp:25, hora:"07:00", fin:"17:30", turno:"Completo",
      desc:"Inicio de fundaciones corridas. Hormigonado zapatas tramo Sur. Se colocaron 45ml de vigas de encadenado.",
      pos:"Calidad mezcla verificada por Ing. Torres in situ. Sin observaciones",
      neg:"Se detectó bolsa de cemento húmeda en acopio — descartadas 8 bolsas.",
      oport:"Suelo presenta mejor carga admisible que la calculada — posible reducción armadura.",
      amenazas:"Pronóstico de lluvia para el jueves.",
      obs:"Aumentar protección de acopio de cemento.", firma:"Rodrigo Torres Vera",
      rubros:[{ desc:"Hormigonado zapatas sector Sur", cant:45, unid:"ml", pct:38 }],
      personal:[
        { nombre:"Santos Aquino",   cat:"Maestro Mayor",  hs:9  },
        { nombre:"Antonio Rodas",   cat:"Oficial Albañil", hs:10 },
        { nombre:"Bernardo Leiva",  cat:"Oficial",         hs:10 },
        { nombre:"César Melgarejo", cat:"Medio Oficial",   hs:9  },
        { nombre:"Dante Ortiz",     cat:"Peón",            hs:10 },
        { nombre:"Emilio Sosa",     cat:"Peón",            hs:10 },
      ],
    },
    {
      dia:30, clima:"Lluvioso", temp:22, hora:"07:30", fin:"13:00", turno:"Mañana",
      desc:"Jornada suspendida a las 13:00h por lluvia intensa. Por la mañana se completaron 2 columnas PB sector Norte.",
      pos:"Las 2 columnas ejecutadas presentan alineación perfecta.", neg:"Obras suspendidas 4h por lluvia.", oport:null,
      amenazas:"Acumulación de agua en zanja de fundación sector Este — riesgo de derrumbe.",
      obs:"Instalar bombas de achique en zanja sector Este antes del mañana.", firma:"Santos Aquino",
      rubros:[{ desc:"Columnas H°A° sector Norte PB", cant:8, unid:"ml", pct:9 }],
      personal:[
        { nombre:"Santos Aquino",   cat:"Maestro Mayor",  hs:5.5 },
        { nombre:"Antonio Rodas",   cat:"Oficial Albañil", hs:5.5 },
        { nombre:"Bernardo Leiva",  cat:"Oficial",         hs:5.5 },
        { nombre:"César Melgarejo", cat:"Medio Oficial",   hs:5.5 },
        { nombre:"Dante Ortiz",     cat:"Peón",            hs:5.5 },
      ],
    },
    {
      dia:60, clima:"Soleado", temp:29, hora:"07:00", fin:"17:30", turno:"Completo",
      desc:"Inicio de mampostería planta baja. Muro perimetral sector living 100% completado. Cuadrilla Benítez incorporada a obra.",
      pos:"Excelente calidad en juntas de mampostería — uniforme y nivelada.", neg:null,
      oport:"Posibilidad de acelerar mampostería PB en 5 días si incorporamos un peón más.", amenazas:null,
      obs:"Cuadrilla Benítez: verificar herramientas en obra antes de fin de jornada.", firma:"Santos Aquino",
      rubros:[
        { desc:"Mampostería muro perimetral living",     cant:85, unid:"m²", pct:14 },
        { desc:"Mampostería muro divisorio cocina/patio", cant:30, unid:"m²", pct:5  },
      ],
      personal:[
        { nombre:"Santos Aquino",   cat:"Maestro Mayor",   hs:9 },
        { nombre:"Roberto Benítez", cat:"Oficial Albañil",  hs:9 },
        { nombre:"Fabio Cabrera",   cat:"Oficial Albañil",  hs:9 },
        { nombre:"German Duarte",   cat:"Medio Oficial",    hs:9 },
        { nombre:"Héctor Flores",   cat:"Peón",             hs:9 },
      ],
    },
    {
      dia:90, clima:"Soleado", temp:30, hora:"07:00", fin:"17:30", turno:"Completo",
      desc:"Losa de planta alta 60% ejecutada. Encofrado verificado. Hormigonado sector dormitorios. Visita de propietario Sr. Martínez.",
      pos:"Propietario satisfecho con el avance. Calidad de obra muy bien valorada.",
      neg:"Vibrador eléctrico falló durante hormigonado — reemplazado con vibrador a gasolina sin pérd. tiempo.",
      oport:"Propietario consulta sobre posibilidad de incorporar pérgola en terraza — evaluar adicional.",
      amenazas:"Ola de calor prevista — cuidado con fraguado acelerado del hormigón.",
      obs:"Registrar consulta de pérgola como posible trabajo adicional.", firma:"Pedro Solís Ramírez",
      rubros:[{ desc:"Losa planta alta — sector dormitorios", cant:80, unid:"m²", pct:57 }],
      personal:[
        { nombre:"Santos Aquino",   cat:"Maestro Mayor",   hs:10 },
        { nombre:"Antonio Rodas",   cat:"Oficial Albañil",  hs:10 },
        { nombre:"Bernardo Leiva",  cat:"Oficial",          hs:10 },
        { nombre:"César Melgarejo", cat:"Medio Oficial",    hs:10 },
        { nombre:"Dante Ortiz",     cat:"Peón",             hs:10 },
        { nombre:"Emilio Sosa",     cat:"Peón",             hs:10 },
        { nombre:"Roberto Benítez", cat:"Oficial Albañil",  hs:10 },
        { nombre:"Fabio Cabrera",   cat:"Oficial Albañil",  hs:10 },
      ],
    },
    {
      dia:120, clima:"Nublado", temp:24, hora:"07:00", fin:"17:00", turno:"Completo",
      desc:"Inicio de instalaciones sanitarias y eléctricas. Cuadrilla Vera incorporada. Mampostería PA 85% completada.",
      pos:"Plomero Mario Vera con amplia experiencia — muy ágil en el roughing.",
      neg:"Discrepancia entre plano I-01 Rev.0 y medidas reales — reprogramar 3 bajadas sanitarias.",
      oport:"Si se corrige el plano antes del viernes, no hay impacto en plazo.",
      amenazas:"Plano I-01 requiere revisión urgente por Arq. Benítez.",
      obs:"URGENTE: Arq. Benítez debe emitir Rev.1 del plano I-01 antes del lunes.", firma:"Pedro Solís Ramírez",
      rubros:[
        { desc:"Roughing sanitario PB (bajadas WC + lavabo)", cant:1, unid:"gl", pct:18 },
        { desc:"Mampostería PA — muro Norte + Este",           cant:145, unid:"m²", pct:85 },
      ],
      personal:[
        { nombre:"Santos Aquino",   cat:"Maestro Mayor",     hs:9 },
        { nombre:"Roberto Benítez", cat:"Oficial Albañil",    hs:9 },
        { nombre:"Mario Vera",      cat:"Plomero Oficial",    hs:9 },
        { nombre:"Néstor Torres",   cat:"Electricista Ofic.", hs:9 },
        { nombre:"Orlando Gaona",   cat:"Ayudante",           hs:9 },
        { nombre:"Fabio Cabrera",   cat:"Oficial Albañil",    hs:9 },
        { nombre:"Héctor Flores",   cat:"Peón",               hs:9 },
      ],
    },
    {
      dia:155, clima:"Soleado", temp:27, hora:"07:00", fin:"17:30", turno:"Completo",
      desc:"Cubierta de teja fibrocemento 90% colocada. Membrana asfáltica sector terraza aplicada. Cuadrilla estructura se despide de obra.",
      pos:"Cubierta con pendiente perfecta — sin irregularidades.", neg:"Teja Nro 7 (sector NO) — 12 unidades rotas en traslado, reposición solicitada.",
      oport:null,
      amenazas:"Inicio de estación lluviosa — necesario completar impermeabilización antes de temporada.",
      obs:"Solicitar reposición de 12 tejas rotas a proveedor y completar colocación.",
      firma:"Santos Aquino",
      rubros:[
        { desc:"Cubierta teja fibrocemento",     cant:144, unid:"m²", pct:90 },
        { desc:"Membrana asfáltica terraza",     cant:45,  unid:"m²", pct:100},
      ],
      personal:[
        { nombre:"Santos Aquino",   cat:"Maestro Mayor",  hs:9 },
        { nombre:"Roberto Benítez", cat:"Oficial Albañil", hs:9 },
        { nombre:"German Duarte",   cat:"Medio Oficial",   hs:9 },
        { nombre:"Héctor Flores",   cat:"Peón",            hs:9 },
      ],
    },
    {
      dia:175, clima:"Soleado", temp:26, hora:"07:00", fin:"17:00", turno:"Completo",
      desc:"Inicio de revoques finos planta baja. Cuadrilla Paredes incorporada con 4 personas. Electricidad PB al 75%.",
      pos:"Revoques con acabado liso excelente — aprobados por dirección.", neg:"Humedad residual en muro Sur PB — retrasar revoque en esa zona.",
      oport:"Muro Sur puede pintarse directamente con pintura anti-humedad en lugar de revoque.",
      amenazas:"Humedad puede generar fisuras si se revoca antes de secar completamente.",
      obs:"Esperar 5 días mínimo para revoque muro Sur. Usar deshumidificador.",
      firma:"Pedro Solís Ramírez",
      rubros:[
        { desc:"Revoque fino PB — living y comedor", cant:95, unid:"m²", pct:20 },
        { desc:"Instalación eléctrica PB — caja y tomacorrientes", cant:1, unid:"gl", pct:75 },
      ],
      personal:[
        { nombre:"Santos Aquino",   cat:"Maestro Mayor",   hs:9 },
        { nombre:"Ignacio Paredes", cat:"Revocador Ofic.",  hs:9 },
        { nombre:"Juan Quispe",     cat:"Revocador Ofic.",  hs:9 },
        { nombre:"Kevin Romero",    cat:"Colocador Pisos",  hs:9 },
        { nombre:"Leonardo Salinas",cat:"Peón",             hs:9 },
        { nombre:"Néstor Torres",   cat:"Electricista Ofic.",hs:9 },
        { nombre:"Orlando Gaona",   cat:"Ayudante",         hs:9 },
      ],
    },
    {
      dia:200, clima:"Soleado", temp:29, hora:"07:00", fin:"17:30", turno:"Completo",
      desc:"Inicio de colocación de pisos sector living-comedor. Revoques PB al 45%. Plomería PA al 60%.",
      pos:"Colocación de porcellanato living con juntas perfectamente alineadas.", neg:"Falta de adhesivo — solo 8 bolsas en stock, se pidió urgente.", oport:null,
      amenazas:"Si el adhesivo no llega antes del jueves, se pausa colocación pisos.",
      obs:"Pedido de 20 bolsas adhesivo a CONSTRUMAX — urgente.",
      firma:"Pedro Solís Ramírez",
      rubros:[
        { desc:"Colocación cerámica living-comedor",  cant:45, unid:"m²", pct:7  },
        { desc:"Revoque fino PB total",               cant:210, unid:"m²", pct:44 },
        { desc:"Plomería PA — roughing y bajadas",    cant:1, unid:"gl", pct:60  },
      ],
      personal:[
        { nombre:"Santos Aquino",   cat:"Maestro Mayor",   hs:9 },
        { nombre:"Ignacio Paredes", cat:"Revocador Ofic.",  hs:9 },
        { nombre:"Juan Quispe",     cat:"Revocador Ofic.",  hs:9 },
        { nombre:"Kevin Romero",    cat:"Colocador Pisos",  hs:9 },
        { nombre:"Leonardo Salinas",cat:"Peón",             hs:9 },
        { nombre:"Mario Vera",      cat:"Plomero Oficial",  hs:9 },
        { nombre:"Orlando Gaona",   cat:"Ayudante",         hs:9 },
      ],
    },
    {
      dia:210, clima:"Parcialmente nublado", temp:25, hora:"07:00", fin:"17:30", turno:"Completo",
      desc:"Avance de obra al día 210: 75% global. Revoques PB al 45%, PA al 12%. Pisos al 20%. Instalaciones al 80%.",
      pos:"Ritmo de avance acorde al cronograma revisado. Cuadrilla Paredes rindiendo bien.",
      neg:"Llegada tardía de porcellanato retrasó sector dormitorios.",
      oport:"Si las lluvias del weekend no afectan, podríamos recuperar 3 días de cronograma.",
      amenazas:"Cuota 4 pendiente de cobro — monitorear flujo de caja.",
      obs:"Reunión de avance con propietario pautada para el viernes 10 de abril.",
      firma:"Pedro Solís Ramírez",
      rubros:[
        { desc:"Revoque fino PB — cocina y dormitorio 1", cant:60, unid:"m²", pct:45 },
        { desc:"Revoque fino PA — inicio suite",          cant:25, unid:"m²", pct:12 },
        { desc:"Colocación cerámica cocina",              cant:18, unid:"m²", pct:20 },
        { desc:"Instalaciones 80% global",                cant:1,  unid:"gl", pct:80 },
      ],
      personal:[
        { nombre:"Santos Aquino",   cat:"Maestro Mayor",   hs:9.5 },
        { nombre:"Ignacio Paredes", cat:"Revocador Ofic.",  hs:9.5 },
        { nombre:"Juan Quispe",     cat:"Revocador Ofic.",  hs:9.5 },
        { nombre:"Kevin Romero",    cat:"Colocador Pisos",  hs:9.5 },
        { nombre:"Leonardo Salinas",cat:"Peón",             hs:9.5 },
        { nombre:"Mario Vera",      cat:"Plomero Oficial",  hs:9.5 },
        { nombre:"Néstor Torres",   cat:"Electricista Ofic.",hs:9.5},
        { nombre:"Orlando Gaona",   cat:"Ayudante",         hs:9.5 },
      ],
    },
  ];

  for (const e of entradas) {
    await prisma.bitacoraEntrada.create({
      data: {
        fecha:             d(e.dia),
        horaInicio:        e.hora,
        horaFin:           e.fin,
        turno:             e.turno,
        clima:             e.clima,
        temperatura:       e.temp,
        descripcionGeneral:e.desc,
        aspectosPositivos: e.pos,
        aspectosNegativos: e.neg,
        oportunidades:     e.oport,
        amenazas:          e.amenazas,
        observaciones:     e.obs,
        responsableFirma:  e.firma,
        proyectoId:        proyecto.id,
        rubrosDelDia:      { create: e.rubros.map(r => ({
          descripcion:r.desc, cantidad:r.cant, unidad:r.unid, avancePct:r.pct,
        }))},
        personalDelDia:    { create: e.personal.map(p => ({
          nombre:p.nombre, categoria:p.cat, horasTrabajadas:p.hs,
        }))},
      },
    });
  }
  console.log(`✅  Bitácora de obra creada (${entradas.length} entradas)`);

  // ╔══════════════════════════════════════════╗
  // ║  18. REUNIONES                           ║
  // ╚══════════════════════════════════════════╝
  await prisma.reunion.createMany({
    data:[
      {
        fecha:d(7), hora:"18:00", lugar:"Oficina TEKOGA — Dr. Montero 1450",
        temas:"Revisión final de planos; aprobación de colores y terminaciones; cronograma de pagos.",
        acta:"Propietarios aprueban planos Rev. 2. Se confirman colores: paredes blanco hueso, pisos porcellanato gris en áreas sociales y cerámica beige en dormitorios. Propietario anticipa cheque para inicio de lunes.",
        estado:"REALIZADA", representantes:"Pedro Solís, Lucía Benítez, Carlos Martínez, María Duarte",
        proyectoId:proyecto.id,
      },
      {
        fecha:d(91), hora:"17:30", lugar:"Obra — Fernando de la Mora",
        temas:"Inspección de losa planta alta; aprobación de avance para cobro cuota 2; consulta pérgola terraza.",
        acta:"Ing. Torres certifica losa en perfecto estado. Se firma certificado de avance para habilitación de cuota 2. Pérgola en terraza se registra como trabajo adicional — solicitar presupuesto.",
        estado:"REALIZADA", representantes:"Pedro Solís, Rodrigo Torres, Carlos Martínez",
        proyectoId:proyecto.id,
      },
      {
        fecha:d(161), hora:"18:00", lugar:"Obra — Fernando de la Mora",
        temas:"Inspección final mampostería + cubierta; aprobación cuota 3; revisión plan instalaciones.",
        acta:"Cubierta aprobada sin observaciones. Cuota 3 habilitada — transferencia realizada. Plano instalaciones I-01 Rev.1 presentado y aprobado.",
        estado:"REALIZADA", representantes:"Pedro Solís, Lucía Benítez, Carlos Martínez, María Duarte",
        proyectoId:proyecto.id,
      },
      {
        fecha:d(214), hora:"18:00", lugar:"Obra — Fernando de la Mora",
        temas:"Revisión avance terminaciones; evaluación cronograma revisado; cobro cuota 4.",
        acta:null,
        estado:"PROGRAMADA", representantes:"Pedro Solís, Carlos Martínez, María Duarte",
        proyectoId:proyecto.id,
      },
    ],
  });
  console.log("✅  Reuniones creadas (4 reuniones)");

  // ╔══════════════════════════════════════════╗
  // ║  19. ANOTACIONES                         ║
  // ╚══════════════════════════════════════════╝
  await prisma.anotacion.createMany({
    data:[
      {
        fecha:d(1), categoria:"OTRO", titulo:"Apertura de obra",
        contenido:"Se abre formalmente el Libro de Obra. Contrato firmado el 20/09/2025 por las partes. Código asignado: PRY-2026-001. Director de Obra designado: Arq. Pedro Solís.",
        autor:"Pedro Solís Ramírez", proyectoId:proyecto.id,
      },
      {
        fecha:d(15), categoria:"MODIFICACION", titulo:"Corrección plano sanitario I-01",
        contenido:"Se detecta discrepancia entre plano original y medidas reales en sala de estar. Arq. Benítez emite Rev 1 del plano I-01 con corrección de 3 bajadas sanitarias. No afecta presupuesto ni plazo.",
        autor:"Lucía Benítez Cáceres", proyectoId:proyecto.id,
      },
      {
        fecha:d(92), categoria:"AJUSTE", titulo:"Trabajo adicional: Pérgola en Terraza",
        contenido:"Propietario solicita incorporar pérgola de madera exótica en terraza de 25m². Monto estimado: Gs. 18.500.000. Se registra como Trabajo Adicional pendiente de aprobación formal. Plazo: 10 días adicionales al cronograma.",
        autor:"Pedro Solís Ramírez", proyectoId:proyecto.id,
      },
      {
        fecha:d(120), categoria:"NOTA_LEGAL", titulo:"Certificado de Calidad Estructural",
        contenido:"Ing. Rodrigo Torres Vera emite Certificado de Calidad Estructural N° 2025-1187 avalando que columnas, vigas y losa de la obra cumplen con los requisitos mínimos del reglamento CIRSOC 101.",
        autor:"Rodrigo Torres Vera", proyectoId:proyecto.id,
      },
      {
        fecha:d(155), categoria:"REUNION", titulo:"Acuerdo de entrega parcial — Cubierta terminada",
        contenido:"En reunión de obra del día se formaliza entrega parcial de cubierta y mampostería. Propietario emite conformidad por escrito. Se habilita cobro de cuota 3 por Gs. 384.000.000.",
        autor:"Pedro Solís Ramírez", proyectoId:proyecto.id,
      },
      {
        fecha:d(180), categoria:"AJUSTE", titulo:"Ajuste de cronograma revisado",
        contenido:"Por lluvias extraordinarias de noviembre y demora en entrega de materiales de pisos, se extiende el plazo 15 días. Nueva fecha estimada de entrega: 22 de junio de 2026. Propietario notificado y conforme.",
        autor:"Pedro Solís Ramírez", proyectoId:proyecto.id,
      },
    ],
  });
  console.log("✅  Anotaciones creadas (6 anotaciones)");

  // ╔══════════════════════════════════════════╗
  // ║  20. TRABAJO ADICIONAL                   ║
  // ╚══════════════════════════════════════════╝
  await prisma.trabajoAdicional.create({
    data:{
      descripcion:"Pérgola de madera exótica (Lapacho) en terraza — 25m²",
      monto:18_500_000, aprobado:true,
      fechaInicio:d(255), fechaFin:d(275),
      observacion:"Aprobado en reunión día 92. Material aún no cotizado definitivamente.",
      proyectoId:proyecto.id,
    },
  });
  console.log("✅  Trabajo adicional creado");

  // ─────────────────────────────────────────
  console.log("\n╔══════════════════════════════════════╗");
  console.log("║   ✅  SEED DEMO COMPLETADO            ║");
  console.log("╠══════════════════════════════════════╣");
  console.log(`║  Proyecto: ${proyecto.nombre.padEnd(28)}║`);
  console.log(`║  ID:       ${proyecto.id.substring(0,28).padEnd(28)}║`);
  console.log("╚══════════════════════════════════════╝\n");

  await prisma.$disconnect();
}

// ─────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────

/** Genera checkpoints de avance progresivos para una tarea */
function avanceCheckpoints(diaInicio, duracion, avanceFinal) {
  const puntos = [];
  if (avanceFinal <= 0) return puntos;
  // 4 puntos: 25%, 50%, 75%, 100% del tiempo transcurrido
  const pcts = avanceFinal === 100
    ? [25, 50, 75, 100]
    : avanceFinal >= 80
    ? [25, 50, 75, avanceFinal]
    : avanceFinal >= 50
    ? [25, 50, avanceFinal]
    : [Math.round(avanceFinal / 2), avanceFinal];

  for (const pct of pcts) {
    const diasDesdeInicio = Math.round((pct / 100) * duracion);
    puntos.push({
      fecha: d(diaInicio + diasDesdeInicio - 1),
      pct:   Math.round((pct / 100) * avanceFinal),
    });
  }
  return puntos;
}

async function upsertUnidad(nombre, simbolo) {
  return prisma.unidadMedida.upsert({
    where:  { nombre },
    update: {},
    create: { nombre, simbolo },
  });
}

async function upsertCatMat(nombre) {
  return prisma.categoriaMaterial.upsert({
    where:  { nombre },
    update: {},
    create: { nombre },
  });
}

async function upsertMat(codigo, nombre, categoriaId, unidadMedidaId, precioBase) {
  return prisma.materialMaestro.upsert({
    where:  { codigo },
    update: {},
    create: { codigo, nombre, categoriaId, unidadMedidaId, precioBase, activo:true },
  });
}

async function upsertCatRub(nombre, orden) {
  return prisma.categoriaRubro.upsert({
    where:  { nombre },
    update: {},
    create: { nombre, orden },
  });
}

async function upsertRubroMaestro(codigo, nombre, categoriaId, unidadMedidaId) {
  return prisma.rubroMaestro.upsert({
    where:  { codigo },
    update: {},
    create: { codigo, nombre, categoriaId, unidadMedidaId, activo:true },
  });
}

main().catch((e) => {
  console.error("❌  Error en seed:", e);
  process.exit(1);
});
