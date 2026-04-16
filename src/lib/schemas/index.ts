/**
 * schemas/index.ts — Schemas de validación Zod centralizados.
 * Usados tanto en Server Actions como en el cliente (react-hook-form).
 */
import { z } from "zod";

// ─── Autenticación ────────────────────────────────────────────────────────────

export const loginSchema = z.object({
  email: z.string().email("Correo electrónico inválido"),
  password: z.string().min(1, "La contraseña es obligatoria"),
});

export const registroSchema = z.object({
  nombre: z
    .string()
    .min(1, "El nombre es obligatorio")
    .max(100, "Máximo 100 caracteres")
    .transform((v) => v.trim()),
  apellido: z
    .string()
    .max(100, "Máximo 100 caracteres")
    .default("")
    .transform((v) => v.trim()),
  email: z
    .string()
    .email("El correo ingresado no es válido")
    .transform((v) => v.trim().toLowerCase()),
  password: z
    .string()
    .min(8, "La contraseña debe tener al menos 8 caracteres")
    .regex(/[A-Z]/, "Debe incluir al menos una letra mayúscula")
    .regex(/[0-9]/, "Debe incluir al menos un número")
    .regex(/[^A-Za-z0-9]/, "Debe incluir al menos un carácter especial"),
});

// ─── Proyectos ────────────────────────────────────────────────────────────────

export const proyectoCodigoSchema = z
  .string()
  .min(1, "El código de obra es obligatorio")
  .max(50, "Máximo 50 caracteres")
  .regex(
    /^[A-Za-z0-9\-_]+$/,
    "El código solo puede contener letras, números, guiones y guiones bajos"
  )
  .transform((v) => v.trim().toUpperCase());

// ─── Proveedores / Compras ────────────────────────────────────────────────────

export const proveedorSchema = z.object({
  razonSocial: z
    .string()
    .min(1, "La razón social es obligatoria")
    .max(200, "Máximo 200 caracteres")
    .transform((v) => v.trim()),
  ruc: z.string().max(50).optional().transform((v) => v?.trim()),
  tipoPersona: z.string().optional(),
  direccion: z.string().max(500).optional().transform((v) => v?.trim()),
  emailEmpresa: z
    .string()
    .email("Email de empresa inválido")
    .optional()
    .or(z.literal(""))
    .transform((v) => v?.trim() || undefined),
  vendedores: z.string().optional(),
  contactoNombre: z
    .string()
    .max(200)
    .optional()
    .transform((v) => v?.trim()),
  contactoTelefono: z.string().max(50).optional().transform((v) => v?.trim()),
  contactoEmail: z
    .string()
    .email("Email de contacto inválido")
    .optional()
    .or(z.literal(""))
    .transform((v) => v?.trim() || undefined),
  banco: z.string().max(200).optional().transform((v) => v?.trim()),
  tipoCuenta: z.string().optional(),
  numeroCuenta: z.string().max(100).optional().transform((v) => v?.trim()),
  observaciones: z.string().optional(),
});

// ─── Usuarios (admin) ─────────────────────────────────────────────────────────

const MODULOS = [
  "PROYECTO", "PRESUPUESTO", "CRONOGRAMA", "FINANCIERO",
  "MANO_OBRA", "LOGISTICA", "COMPRAS", "INVENTARIO", "BITACORA", "REPORTES",
] as const;

export const passwordSchema = z
  .string()
  .min(8, "La contraseña debe tener al menos 8 caracteres")
  .regex(/[A-Z]/, "Debe incluir al menos una letra mayúscula")
  .regex(/[0-9]/, "Debe incluir al menos un número")
  .regex(/[^A-Za-z0-9]/, "Debe incluir al menos un carácter especial");

export const nuevoUsuarioSchema = z.object({
  nombre: z
    .string()
    .min(1, "El nombre es obligatorio")
    .max(100)
    .transform((v) => v.trim()),
  apellido: z.string().max(100).default("").transform((v) => v.trim()),
  email: z
    .string()
    .email("El correo no es válido")
    .transform((v) => v.trim().toLowerCase()),
  password: passwordSchema,
  permisos: z
    .array(z.enum(MODULOS))
    .min(1, "Asigná al menos un módulo al usuario"),
});

export type NuevoUsuarioInput = z.infer<typeof nuevoUsuarioSchema>;

// ─── Financiero ───────────────────────────────────────────────────────────────

export const movimientoSchema = z.object({
  fecha: z.string().min(1, "La fecha es obligatoria"),
  concepto: z.string().min(1, "El concepto es obligatorio").max(500).transform((v) => v.trim()),
  beneficiario: z.string().min(1, "El beneficiario es obligatorio").max(300).transform((v) => v.trim()),
  monto: z.number({ error: "El monto debe ser un número" }).positive("El monto debe ser mayor a 0"),
  metodoPago: z.string().min(1, "El método de pago es obligatorio"),
  tipo: z.enum(["INGRESO", "EGRESO"]),
  nroComprobante: z.string().max(100).optional().transform((v) => v?.trim()),
  autorizadoPor: z.string().max(200).optional().transform((v) => v?.trim()),
  observacion: z.string().max(1000).optional().transform((v) => v?.trim()),
});

export type MovimientoInput = z.infer<typeof movimientoSchema>;

// ─── Facturas / Compras ───────────────────────────────────────────────────────

export const facturaSchema = z.object({
  nroFactura: z.string().min(1, "El número de factura es obligatorio").max(100).transform((v) => v.trim()),
  fecha: z.string().min(1, "La fecha es obligatoria"),
  concepto: z.string().min(1, "El concepto es obligatorio").max(500).transform((v) => v.trim()),
  monto: z.number({ error: "El monto debe ser un número" }).positive("El monto debe ser mayor a 0"),
  proveedorId: z.string().min(1, "Seleccioná un proveedor"),
  fechaVencimiento: z.string().optional(),
  observacion: z.string().max(1000).optional().transform((v) => v?.trim()),
});

export type FacturaInput = z.infer<typeof facturaSchema>;

// ─── Movimiento financiero — tipos Server Action (enum completo) ──────────────
// Separado de movimientoSchema porque usa el enum completo de TipoMovimiento

const TIPOS_MOVIMIENTO = [
  "INGRESO_CLIENTE",
  "EGRESO_PROVEEDOR",
  "EGRESO_PERSONAL",
  "EGRESO_MAQUINARIA",
  "EGRESO_HONORARIO",
  "EGRESO_CAJA_CHICA",
  "EGRESO_OTRO",
] as const;

const METODOS_PAGO = ["EFECTIVO", "CHEQUE", "TRANSFERENCIA", "GIRO", "OTRO"] as const;

export const crearMovimientoSchema = z.object({
  fecha: z.string().min(1, "La fecha es obligatoria"),
  tipo: z.enum(TIPOS_MOVIMIENTO, { error: "Tipo de movimiento inválido" }),
  concepto: z
    .string()
    .min(1, "El concepto es obligatorio")
    .max(500, "Máximo 500 caracteres")
    .transform((v) => v.trim()),
  beneficiario: z
    .string()
    .min(1, "El beneficiario es obligatorio")
    .max(300, "Máximo 300 caracteres")
    .transform((v) => v.trim()),
  monto: z
    .number({ error: "El monto debe ser un número" })
    .positive("El monto debe ser mayor a 0"),
  metodoPago: z.enum(METODOS_PAGO, { error: "Método de pago inválido" }),
  nroComprobante: z.string().max(100).optional().transform((v) => v?.trim()),
  autorizadoPor: z.string().max(200).optional().transform((v) => v?.trim()),
  realizadoPor: z.string().max(200).optional().transform((v) => v?.trim()),
  observacion: z.string().max(1000).optional().transform((v) => v?.trim()),
  otroMetodoDetalle: z.string().max(200).optional().transform((v) => v?.trim()),
  nroCheque: z.string().max(100).optional().transform((v) => v?.trim()),
  bancoCheque: z.string().max(200).optional().transform((v) => v?.trim()),
  fechaEmisionCheque: z.string().optional(),
  fechaCobroCheque: z.string().optional(),
  nroTransaccion: z.string().max(100).optional().transform((v) => v?.trim()),
  bancoTransfer: z.string().max(200).optional().transform((v) => v?.trim()),
  proveedorId: z.string().optional(),
  cuotaPagoId: z.string().optional(),
  contratoManoObraId: z.string().optional(),
});

export type CrearMovimientoInput = z.infer<typeof crearMovimientoSchema>;

// ─── Tipos inferidos ──────────────────────────────────────────────────────────

export type LoginInput = z.infer<typeof loginSchema>;
export type RegistroInput = z.infer<typeof registroSchema>;
export type ProveedorInput = z.infer<typeof proveedorSchema>;
