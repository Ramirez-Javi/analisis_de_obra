# TEKÓGA — Auditoría General del Sistema
**Versión auditada:** 1.0 (commit `b525c19`)  
**Fecha de auditoría:** Abril 2026  
**Metodología:** Revisión estática de código fuente (SAST), análisis de arquitectura, mapeo OWASP Top 10

---

## Resumen Ejecutivo

El sistema presenta una base de seguridad sólida y una arquitectura bien estructurada. La mayoría de los controles críticos (autenticación, criptografía, headers HTTP, validación de entradas, RBAC) están correctamente implementados. Se identificaron **1 hallazgo crítico**, **4 hallazgos de severidad media** y **6 hallazgos informativos/bajos**.

| Calificación General | B+ |
|---|---|
| Seguridad | B |
| Arquitectura | A- |
| Calidad de código | B+ |
| Cobertura de tests | C (en progreso) |

---

## Metodología

Se auditaron en forma estática los siguientes archivos:

| Área | Archivos revisados |
|---|---|
| Autenticación | `auth.ts`, `auth.config.ts`, `rate-limit.ts`, `session.ts`, `campo-session.ts`, `totp.ts` |
| Criptografía | `crypto.ts`, `bcrypt` (uso en actions) |
| API Routes | `/api/tunnel/route.ts`, `/api/local-url/route.ts`, `/api/campo/auth/route.ts` |
| Server Actions | `registro/actions.ts`, `admin/usuarios/actions.ts`, `proyectos/[id]/campo/actions.ts`, `campo/[id]/bitacora/actions.ts` |
| Infraestructura | `prisma.ts`, `env.ts`, `logger.ts`, `audit.ts` |
| Middleware/CSP | `proxy.ts`, `next.config.ts` |
| Base de datos | `prisma/schema.prisma` |

---

## Módulo 1 — Autenticación y Sesiones

**Calificación: A-**

### Fortalezas
- NextAuth v5 con estrategia JWT (sin almacenamiento de sesión en BD — stateless, escalable).
- Sessions con expiración de 8 horas y renovación automática.
- Revalidación activa del usuario cada 5 minutos desde la BD: si un admin desactiva una cuenta, el usuario queda fuera en máximo 5 min.
- Rate limiting: 5 intentos fallidos por dirección de email en ventana de 15 minutos.
- TOTP completamente implementado: generación, validación con ±1 período de tolerancia, inhabilitación segura con validación previa.
- Secretos TOTP cifrados con AES-256-GCM antes de persistir en BD.
- bcrypt con factor de costo 12 para contraseñas.
- Audit log en todos los eventos de autenticación.

### Debilidades

| ID | Severidad | Descripción |
|---|---|---|
| AUTH-01 | 🟡 MEDIO | Rate limiting en memoria (`Map`): se resetea en cada reinicio del proceso. En contextos de servidor persistente (Electron) es aceptable, pero en Vercel se reinicia con frecuencia y la protección puede anularse. |
| AUTH-02 | 🟠 BAJO | Rate limiting solo por email, no por IP. Un atacante con múltiples cuentas de destino bajo la misma IP no es detectado. |
| AUTH-03 | 🟠 BAJO | Secreto de sessión de campo con fallback hardcodeado (ver Módulo 10). |

---

## Módulo 2 — Autorización y Control de Acceso (RBAC)

**Calificación: A-**

### Fortalezas
- Middleware (`proxy.ts`) implementa RBAC basado en `modulo`: mapea rutas URL a módulos del sistema y valida permisos del JWT.
- Los ADMIN tienen acceso global implícito; los USUARIO tienen permisos granulares por módulo.
- `requireAdmin()` está implementado inline en cada action que lo requiere — verifica sesión activa y rol antes de ejecutar cualquier operación.
- No existe escalación horizontal: la `empresaId` se toma del JWT, no de la URL o del body del request.
- `requireCampoSession()` valida que el `proyectoId` del JWT de campo coincida con el proyecto solicitado.

### Debilidades

| ID | Severidad | Descripción |
|---|---|---|
| RBAC-01 | 🟠 BAJO | Dead whitelist entry: `/api/debug-auth` está declarado como ruta pública en `proxy.ts` pero no existe ninguna ruta con ese path. Dejar rutas inexistentes en whitelist no es un riesgo directo, pero refleja deuda técnica. |

---

## Módulo 3 — API Routes y Endpoints

**Calificación: C+**

> **El único hallazgo crítico del sistema se encuentra en este módulo.**

### 🔴 CRÍTICO — Tunnel sin autenticación

**Archivo:** `src/app/api/tunnel/route.ts`  
**ID:** API-01

El endpoint `/api/tunnel` permite iniciar y detener el túnel de Cloudflare mediante peticiones `GET` y `POST` sin ninguna verificación de sesión. Cualquier persona que conozca la URL del servidor puede:

1. Abrir un túnel público desde el servidor Electron de la empresa hacia Internet.
2. Cerrar un túnel activo, interrumpiendo el acceso remoto.

```
GET  /api/tunnel  → devuelve estado del túnel (sin auth)
POST /api/tunnel  { "action": "start" }  → inicia túnel (SIN AUTH)
POST /api/tunnel  { "action": "stop"  }  → cierra túnel (SIN AUTH)
```

**Impacto:** Un atacante en la red local (o con acceso al puerto expuesto) puede activar un túnel hacia Internet, exponiendo el sistema a acceso externo no autorizado.

**Corrección requerida:** Agregar `auth()` al inicio de ambos handlers:

```typescript
import { auth } from "@/lib/auth";

export async function GET() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }
  // ...resto del handler
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }
  // ...resto del handler
}
```

### Otros endpoints

| Endpoint | Auth | Estado |
|---|---|---|
| `/api/local-url` | ✅ `auth()` | OK |
| `/api/campo/auth` | ✅ Pública (diseño correcto — es el login de campo) | OK |
| `/api/tunnel` | ❌ Sin auth | **CRÍTICO** |

---

## Módulo 4 — Validación de Entradas

**Calificación: A-**

### Fortalezas
- Schemas Zod completos para todas las entidades principales definidos en `src/lib/schemas/index.ts`.
- Validación en el servidor (Server Actions) con `safeParse()` — nunca se confía ciegamente en el cliente.
- Longitudes máximas, formatos de email, rangos numéricos y enums validados.
- PINs de campo: validación estricta de 4–6 dígitos numéricos.

### Debilidades

| ID | Severidad | Descripción |
|---|---|---|
| VAL-01 | 🟢 INFO | Validación de `enlaceFotos` solo verifica `startsWith("http")`. URLs con esquemas como `ftp://`, `file://` o `javascript:` (en navegadores sin sanitización) pasarían la validación. Recomendación: validar con `URL` nativo y restringir a `https?:` únicamente. |

---

## Módulo 5 — Criptografía y Almacenamiento Seguro

**Calificación: A**

### Fortalezas
- AES-256-GCM para cifrado de secretos TOTP: IV aleatorio de 12 bytes por cifrado, tag de autenticación de 128 bits.
- Compatibilidad retroactiva para secretos sin cifrar (migración gradual).
- bcrypt con factor de costo 12 para contraseñas de usuario (costo computacional adecuado — aprox. 250ms en hardware moderno).
- No se almacenan contraseñas en texto plano en logs ni en errores.
- No se encontraron patrones `setCookie` con flags inseguros (`secure: false`, `sameSite: "none"` sin `secure`).

### Debilidades

| ID | Severidad | Descripción |
|---|---|---|
| CRYPT-01 | 🟠 BAJO | PINs de campo usan `bcrypt` con factor de costo 10 (vs. 12 para contraseñas). Los PINs son de 4–6 dígitos, lo que los hace más vulnerables a fuerza bruta offline. Subir el factor a 12 o 13 haría el ataque significativamente más costoso. |

---

## Módulo 6 — Logging, Auditoría y Monitoreo

**Calificación: B**

### Fortalezas
- Sistema de audit log centralizado en `src/lib/audit.ts` que persiste eventos en la BD (`AuditLog`).
- Logger estructurado en `src/lib/logger.ts` (niveles: `info`, `warn`, `error`).
- Sentry integrado con `sentry.client.config.ts`, `sentry.server.config.ts`, `sentry.edge.config.ts`.
- Source maps subidos a Sentry y eliminados del build de producción — correcto.

### Debilidades

| ID | Severidad | Descripción |
|---|---|---|
| LOG-01 | 🟠 BAJO | Se encontraron 7 llamadas a `console.error()` directas en `auth.ts`, `proyectos.ts` y `compras/actions.ts` en lugar de usar el `logger` centralizado. Esto genera inconsistencia en el formato de logs y puede perderse contexto estructurado. |

---

## Módulo 7 — Base de Datos y Prisma

**Calificación: B+**

### Fortalezas
- Índices definidos en las columnas de mayor uso: `empresaId`, `proyectoId`, `estado`, `fecha`.
- Cascade deletes configurados correctamente en todos los modelos hijo.
- PgBouncer-compatible: `connection_limit: 1`, timeouts configurados.
- Singleton pattern HMR-safe (`global.__prisma`).
- `CampoAcceso` tiene `@@index([proyectoId])` — ya corregido.

### Debilidades

| ID | Severidad | Descripción |
|---|---|---|
| DB-01 | 🟡 MEDIO | `process.env.DATABASE_URL!` en `src/lib/prisma.ts` usa el operador de aserción no nula de TypeScript. Si `DATABASE_URL` no está definida, el error producido es un crash genérico de Prisma en lugar de un mensaje descriptivo. Se recomienda usar `requireEnv("DATABASE_URL")` del módulo `src/lib/env.ts`. |

---

## Módulo 8 — Headers de Seguridad y CSP

**Calificación: A**

### Fortalezas
- CSP (Content Security Policy) con nonce generado por request (`crypto.randomUUID()`) — previene XSS inline.
- HSTS: `max-age=63072000` (2 años), `includeSubDomains`, `preload`.
- `X-Frame-Options: DENY` — previene clickjacking.
- `X-Content-Type-Options: nosniff` — previene MIME sniffing.
- `Referrer-Policy: strict-origin-when-cross-origin` — apropiado.
- `Permissions-Policy` configurada: deshabilita cámara, micrófono, geolocalización.
- CORS explícito con whitelist: `localhost:3000`, `localhost:3001`, `tekoinnova.com`.

### Debilidades

| ID | Severidad | Descripción |
|---|---|---|
| CSP-01 | 🟡 MEDIO | La lista `ALLOWED_ORIGINS` en `proxy.ts` está hardcodeada e incluye `tekoinnova.com` pero no la URL dinámica de Vercel (`*.vercel.app`). Si el frontend se sirve desde una URL de preview de Vercel distinta, las requests CORS serán rechazadas. |

---

## Módulo 9 — Arquitectura y Calidad de Código

**Calificación: B+**

### Fortalezas
- Arquitectura Hub & Spoke bien definida con `Proyecto` como entidad central.
- Separación clara entre Base de Datos Maestra (read-only) y datos de proyecto (editables).
- Server Actions con validación Zod en todas las mutaciones.
- Módulos separados en `src/modules/` con lógica de negocio desacoplada de la UI.
- `next.config.ts` con `optimizePackageImports` correctamente configurado.
- Sin patrones de N+1 evidentes en los actions revisados (uso de `include` en lugar de queries encadenadas).

### Debilidades

| ID | Severidad | Descripción |
|---|---|---|
| ARCH-01 | 🟠 BAJO | `requireAdmin()` está duplicado inline en múltiples Server Actions en lugar de ser una función de librería importada. Si la lógica de autorización cambia, hay que actualizarla en múltiples lugares. |
| ARCH-02 | 🟠 BAJO | No hay tests de integración para Server Actions (solo unitarios para helpers). El directorio `__tests__/integration/` existe pero está vacío. |

---

## Módulo 10 — Acceso de Campo (CampoAcceso)

**Calificación: B**

### Fortalezas
- JWT separado del sistema principal: derivado como `campo|${AUTH_SECRET}` — no hay colisión de tokens.
- `requireCampoSession()` valida proyectoId en cada action de campo.
- `CampoAcceso.activo` permite revocar acceso sin eliminar el registro.
- Sin acceso a datos más allá del proyecto asignado.

### Debilidades

| ID | Severidad | Descripción |
|---|---|---|
| CAMPO-01 | 🟡 MEDIO | Secreto JWT de campo con **fallback hardcodeado**: `"campo-dev-secret-change-in-production"` en `src/lib/campo-session.ts`. Si `AUTH_SECRET` no está definido en producción, los tokens de campo serán firmados con un secreto público y predecible. |
| CAMPO-02 | 🟢 INFO | No hay rate limiting en `/api/campo/auth`. Un atacante con conocimiento del ID de proyecto y nombre de usuario puede realizar ataques de fuerza bruta sobre PINs de 4 dígitos (10.000 combinaciones). El factor bcrypt lo ralentiza, pero no hay límite de intentos. |

---

## Mapa OWASP Top 10 (2021)

| OWASP | Categoría | Estado | Hallazgos |
|---|---|---|---|
| A01 | Broken Access Control | ⚠️ PARCIAL | API-01: `/api/tunnel` sin auth |
| A02 | Cryptographic Failures | ✅ OK | AES-256-GCM, bcrypt 12, JWT HS256 |
| A03 | Injection | ✅ OK | Prisma ORM previene SQL injection |
| A04 | Insecure Design | ✅ OK | RBAC, validación en servidor |
| A05 | Security Misconfiguration | ⚠️ PARCIAL | CORS hardcodeado, fallback secret |
| A06 | Vulnerable Components | ✅ OK | Dependencias actualizadas (Next 16, Prisma 7) |
| A07 | Auth & Session Failures | ✅ OK | JWT, TOTP, rate limiting, revalidación |
| A08 | Software & Data Integrity | ✅ OK | Source maps privados, Sentry upload |
| A09 | Logging & Monitoring | ⚠️ PARCIAL | LOG-01: console.error en lugar de logger |
| A10 | SSRF | ✅ OK | Sin llamadas a URLs externas controladas por usuario |

---

## Tabla de Hallazgos — Resumen

| ID | Severidad | Módulo | Descripción | Archivo |
|---|---|---|---|---|
| API-01 | 🔴 CRÍTICO | API Routes | `/api/tunnel` sin autenticación | `src/app/api/tunnel/route.ts` |
| AUTH-01 | 🟡 MEDIO | Auth | Rate limiting en memoria (bypass en restart) | `src/lib/rate-limit.ts` |
| CAMPO-01 | 🟡 MEDIO | Campo | Secreto JWT fallback hardcodeado | `src/lib/campo-session.ts` |
| DB-01 | 🟡 MEDIO | Base de datos | `DATABASE_URL!` sin validación segura | `src/lib/prisma.ts` |
| CSP-01 | 🟡 MEDIO | CSP/CORS | CORS no incluye URL dinámica de Vercel preview | `src/proxy.ts` |
| CRYPT-01 | 🟠 BAJO | Criptografía | bcrypt cost 10 para PINs (vs. 12 para passwords) | `proyectos/[id]/campo/actions.ts` |
| LOG-01 | 🟠 BAJO | Logging | `console.error` en lugar de `logger` centralizado | varios archivos |
| RBAC-01 | 🟠 BAJO | RBAC | Dead whitelist entry `/api/debug-auth` | `src/proxy.ts` |
| ARCH-01 | 🟠 BAJO | Arquitectura | `requireAdmin()` duplicado inline | múltiples actions |
| ARCH-02 | 🟠 BAJO | Tests | `__tests__/integration/` vacío | `src/__tests__/` |
| AUTH-02 | 🟢 INFO | Auth | Rate limiting solo por email, no por IP | `src/lib/rate-limit.ts` |
| VAL-01 | 🟢 INFO | Validación | `enlaceFotos` validación URL mínima | `bitacora/actions.ts` |
| CAMPO-02 | 🟢 INFO | Campo | Sin rate limiting en auth de campo | `src/app/api/campo/auth/route.ts` |

---

## Roadmap de Correcciones Priorizadas

### Prioridad 1 — INMEDIATA (antes del próximo deploy)

**API-01: Agregar auth a `/api/tunnel`**

```typescript
// src/app/api/tunnel/route.ts — agregar al inicio de GET y POST:
import { auth } from "@/lib/auth";

export async function GET() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }
  // ...código existente...
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }
  // ...código existente...
}
```

---

### Prioridad 2 — CORTO PLAZO (próximo sprint)

**DB-01: Usar `requireEnv()` en Prisma**

```typescript
// src/lib/prisma.ts — reemplazar:
datasourceUrl: process.env.DATABASE_URL!,
// por:
import { requireEnv } from "@/lib/env";
datasourceUrl: requireEnv("DATABASE_URL"),
```

**CAMPO-01: Eliminar fallback hardcodeado**

```typescript
// src/lib/campo-session.ts — reemplazar:
const CAMPO_SECRET = `campo|${process.env.AUTH_SECRET ?? "campo-dev-secret-change-in-production"}`;
// por:
import { requireEnv } from "@/lib/env";
const CAMPO_SECRET = `campo|${requireEnv("AUTH_SECRET")}`;
```

**CRYPT-01: Igualar factor bcrypt para PINs**

```typescript
// proyectos/[id]/campo/actions.ts — reemplazar:
const pinHash = await bcrypt.hash(pin, 10);
// por:
const pinHash = await bcrypt.hash(pin, 12);
```

---

### Prioridad 3 — MEDIANO PLAZO

- **LOG-01**: Reemplazar `console.error` con `logger.error` en `auth.ts`, `proyectos.ts`, `compras/actions.ts`.
- **RBAC-01**: Eliminar `/api/debug-auth` de la whitelist pública en `proxy.ts`.
- **VAL-01**: Mejorar validación de `enlaceFotos` con `URL` nativo y restricción a `https?:`.
- **AUTH-01**: Evaluar Redis para rate limiting si se escala a multi-instancia.
- **CSP-01**: Agregar `process.env.VERCEL_URL` a `ALLOWED_ORIGINS` si se usa Vercel preview.
- **ARCH-01**: Extraer `requireAdmin()` a `src/lib/auth-helpers.ts` reutilizable.

---

## Conclusión

El sistema TEKÓGA demuestra un nivel de madurez de seguridad superior al promedio para una aplicación de gestión de construcción. La autenticación, cifrado, CSP y RBAC están bien implementados.

**El único riesgo real e inmediato es la ausencia de autenticación en `/api/tunnel`**, que debe corregirse antes del próximo deployment en cualquier entorno accesible en red.

El resto de los hallazgos son mejoras de buenas prácticas que pueden abordarse de forma iterativa sin riesgo operacional inmediato.
