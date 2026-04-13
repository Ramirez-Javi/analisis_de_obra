# TEKÓGA — Descripción Técnica del Sistema

> **Documento de referencia técnica para integradores, soporte avanzado y auditorías**  
> Versión 1.0 · Abril 2026  
> Desarrollado por **TekoInnova** — Asunción, Paraguay

---

## Tabla de contenidos

1. [Visión general del sistema](#1-visión-general-del-sistema)
2. [Stack tecnológico](#2-stack-tecnológico)
3. [Arquitectura de la aplicación](#3-arquitectura-de-la-aplicación)
4. [Modelo de datos (entidades principales)](#4-modelo-de-datos-entidades-principales)
5. [Sistema de autenticación y autorización](#5-sistema-de-autenticación-y-autorización)
6. [Módulos del sistema](#6-módulos-del-sistema)
7. [Arquitectura de red y acceso remoto](#7-arquitectura-de-red-y-acceso-remoto)
8. [Acceso de campo (CampoAcceso)](#8-acceso-de-campo-campoaccceso)
9. [Seguridad](#9-seguridad)
10. [Almacenamiento y backup](#10-almacenamiento-y-backup)
11. [Registro de auditoría](#11-registro-de-auditoría)
12. [Empaquetado Electron](#12-empaquetado-electron)

---

## 1. Visión general del sistema

TEKÓGA es una aplicación web fullstack (Next.js) empaquetada como aplicación de escritorio (Electron) que opera en modo **servidor local** dentro de la red de la empresa cliente.

### Características técnicas clave

- **Sin dependencia de nube para funcionamiento**: Una vez instalado, opera completamente offline en la red local
- **Multiusuario concurrente**: PostgreSQL como motor de base de datos garantiza integridad en escrituras simultáneas
- **Acceso web universal**: Los clientes de la red se conectan vía navegador estándar — sin instalación adicional
- **Acceso de campo seguro**: Cloudflare Tunnel crea un túnel cifrado desde el servidor local hacia internet para los fiscales con dispositivos móviles
- **Arquitectura Hub & Spoke**: La base de datos maestra (materiales, rubros, recetas) es global; cada proyecto tiene sus propias copias de trabajo

---

## 2. Stack tecnológico

| Capa | Tecnología | Versión |
|------|-----------|---------|
| Framework web | Next.js (App Router) | 16.2.2 |
| Lenguaje | TypeScript | 5.x |
| Runtime | Node.js | 22.x |
| React | React | 19.x |
| ORM | Prisma | 7.6.0 |
| Base de datos | PostgreSQL | 16.x |
| Autenticación | NextAuth.js | v5 beta.30 |
| Encriptación | bcryptjs, crypto (Node) | — |
| UI Components | Tailwind CSS | 4.x |
| Iconos | Lucide React | — |
| Gráficos | Recharts | — |
| Notificaciones | Sonner | — |
| Empaquetado escritorio | Electron | — |
| Build | electron-builder | — |
| Monitoring | Sentry | — |
| QR | qrcode (npm) | — |
| Túnel remoto | Cloudflare Tunnel (cloudflared) | — |
| Validación | Zod | — |
| Rate limiting | Implementación propia con Map() | — |

---

## 3. Arquitectura de la aplicación

### Flujo de peticiones

```
Navegador del cliente
        │
        ▼
 Next.js App Router (src/app/)
        │
        ├── Server Components (lectura directa a DB vía Prisma)
        │
        ├── Server Actions (mutaciones — src/app/actions/ y por módulo)
        │
        ├── API Routes (src/app/api/)
        │   ├── /api/auth/[...nextauth] — NextAuth
        │   ├── /api/campo/auth — autenticación PIN campo
        │   ├── /api/local-url — IP local para AccesoOficinaCard
        │   └── /api/tunnel — estado/gestión del túnel Cloudflare
        │
        └── Middleware (src/middleware.ts)
            └── Verificación JWT en rutas protegidas
```

### Estructura de directorios

```
src/
├── app/                    # Pages y Server Actions (App Router)
│   ├── (módulos)/          # Rutas por módulo
│   ├── admin/              # Panel de administración
│   ├── api/                # API Routes
│   ├── campo/[id]/         # UI móvil para acceso de campo
│   └── actions/            # Server Actions globales
├── components/             # Componentes React reutilizables
│   ├── admin/
│   ├── ficha/
│   ├── shared/
│   └── ...
├── lib/                    # Utilidades del servidor
│   ├── auth.ts             # Configuración NextAuth
│   ├── prisma.ts           # Singleton PrismaClient
│   ├── session.ts          # Helpers de sesión
│   ├── campo-session.ts    # Sesión JWT para campo
│   ├── crypto.ts           # Funciones criptográficas
│   ├── rate-limit.ts       # Rate limiting in-memory
│   ├── totp.ts             # TOTP para 2FA (futuro)
│   └── schemas/            # Esquemas Zod de validación
├── modules/                # Lógica de negocio por módulo
└── types/                  # Definiciones de tipos TypeScript
```

---

## 4. Modelo de datos (entidades principales)

La base de datos sigue una arquitectura **Hub & Spoke**:

### Maestros globales (Hub)
No pertenecen a ningún proyecto; son la base de datos maestra de la empresa:

| Entidad | Descripción |
|---------|-------------|
| `UnidadMedida` | m², m³, kg, u, ml, etc. |
| `MaterialMaestro` | Catálogo de materiales con precio base |
| `CategoriaMaterial` | Agrupación de materiales |
| `RubroMaestro` | Catálogo de partidas de obra |
| `CategoriaRubro` | Agrupación de rubros |
| `RecetaMaestraDetalle` | Ingredientes por unidad de rubro |
| `Empresa` | Datos de la empresa constructora (único registro) |
| `Proveedor` | Catálogo de proveedores compartido entre proyectos |
| `Usuario` | Usuarios del sistema con roles y permisos |

### Proyecto y sus Spokes

Cada `Proyecto` tiene sus propias entidades:

| Entidad | Módulo |
|---------|--------|
| `Propietario` | Ficha |
| `MiembroEquipo` | Ficha |
| `LaminaPlano` | Ficha |
| `CampoAcceso` | Acceso de campo |
| `RubroProyecto` | Presupuesto |
| `InsumoProyecto` | Presupuesto |
| `TareasCronograma` | Cronograma |
| `MovimientoFinanciero` | Financiero |
| `CertificadoAvance` | Financiero |
| `PersonalObra` | Mano de Obra |
| `RegistroAsistencia` | Mano de Obra |
| `SolicitudLogistica` | Logística |
| `OrdenCompra` | Compras |
| `RecepcionBodega` | Inventario |
| `InstalacionAmbiente` | Inventario (As-Built) |
| `EntradaBitacora` | Bitácora |
| `AlertaStock` | Bitácora |

### Modelo CampoAcceso

Entidad central para el acceso de campo por proyecto:

```prisma
model CampoAcceso {
  id         String  @id @default(cuid())
  nombre     String
  cargo      String
  pinHash    String  // bcrypt hash del PIN (4-6 dígitos)
  activo     Boolean @default(true)

  proyectoId String
  proyecto   Proyecto @relation(fields: [proyectoId], references: [id], onDelete: Cascade)

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}
```

---

## 5. Sistema de autenticación y autorización

### Usuarios de oficina

- **Motor**: NextAuth.js v5 con estrategia **JWT**
- **Duración de sesión**: 8 horas (`maxAge: 28800`)
- **Almacenamiento**: Cookie `HttpOnly`, `Secure`, `SameSite=Lax`
- **Hash de contraseñas**: `bcryptjs` con factor de coste 12
- **Roles**: `ADMIN` | `USUARIO`
- **Permisos**: Tabla `Permiso` por módulo para usuarios con rol `USUARIO`

El middleware (`src/middleware.ts`) verifica el JWT en todas las rutas protegidas antes de llegar al Server Component.

### Fiscales y capataces (acceso de campo)

- **Flujo**: QR → PIN → JWT propio de campo
- **Endpoint de autenticación**: `POST /api/campo/auth`
- **Verificación de PIN**: `bcrypt.compare(pin, campoAcceso.pinHash)`
- **Token de campo**: JWT firmado con `CAMPO_SECRET` separado del JWT de usuarios de oficina
- **Duración**: 12 horas (configurable)
- **Scope**: Restringido al `proyectoId` incluido en el payload del token
- **Helper de sesión**: `src/lib/campo-session.ts` — `getCampoSession()` / `setCampoSession()` / `clearCampoSession()`

### Rate limiting

Implementado en memoria (`src/lib/rate-limit.ts`) con ventana deslizante:
- Máximo de intentos por IP en un período definido
- Se aplica a los endpoints de autenticación para prevenir ataques de fuerza bruta
- En producción con múltiples instancias se debería migrar a Redis; en el modelo single-node de TEKÓGA la implementación in-memory es suficiente

---

## 6. Módulos del sistema

| # | Módulo | Ruta | Actions principales |
|---|--------|------|---------------------|
| 1 | Proyectos / Ficha | `/proyectos` | crear, editar, eliminar proyecto; CRUD propietarios, equipo, láminas |
| 2 | Presupuesto | `/proyectos/[id]/presupuesto` | CRUD rubros, insumos, cómputo métrico |
| 3 | Cronograma | `/proyectos/[id]/cronograma` | CRUD tareas, actualizar avance |
| 4 | Financiero | `/proyectos/[id]/financiero` | CRUD movimientos, certificados |
| 5 | Mano de Obra | `/proyectos/[id]/mano-obra` | CRUD personal, asistencia, pagos |
| 6 | Logística | `/proyectos/[id]/logistica` | CRUD solicitudes |
| 7 | Compras | `/proyectos/[id]/compras` | CRUD órdenes de compra |
| 8 | Inventario | `/proyectos/[id]/inventario` | Recepción bodega, instalación As-Built |
| 9 | Bitácora | `/proyectos/[id]/bitacora` + `/campo/[id]/bitacora` | CRUD entradas, alertas stock |
| 10 | Reportes | `/proyectos/[id]/reportes` | Generación y exportación |
| Adm | Admin Usuarios | `/admin/usuarios` | CRUD usuarios, permisos, activar/desactivar |
| Adm | Admin Catálogos | `/admin/*` | CRUD catálogos globales |

### Server Actions vs. API Routes

TEKÓGA usa **Server Actions de Next.js** para la mayoría de las mutaciones. Las API Routes se reservan para flujos que requieren respuesta custom (autenticación campo, información de red, estado del túnel).

---

## 7. Arquitectura de red y acceso remoto

### Acceso LAN (red local de oficina)

```
Servidor (puerto 3000, Next.js)  ←→  Clientes (navegador en su IP local)
```

El endpoint `GET /api/local-url` usa `os.networkInterfaces()` de Node.js para detectar la IP privada del servidor y la muestra en el panel de administración (`AccesoOficinaCard`).

### Acceso de campo (Cloudflare Tunnel)

```
Celular del fiscal
      │  HTTPS
      ▼
Cloudflare Edge (URL pública: xxxxxx.trycloudflare.com)
      │  TLS encriptado
      ▼
cloudflared.exe (en el servidor local)
      │  localhost
      ▼
Next.js en puerto 3000
```

El binario `cloudflared.exe` (Windows) o `cloudflared` (Mac/Linux) se incluye en `resources/` de la distribución Electron.

La API Route `GET /api/tunnel` gestiona el ciclo de vida del proceso.

---

## 8. Acceso de campo (CampoAcceso)

### Flujo completo

1. **Administrador crea `CampoAcceso`**: nombre, cargo, PIN → se guarda `bcrypt(PIN, 12)` como `pinHash`
2. **QR generado**: contiene la URL `https://<tunnel>.trycloudflare.com/campo/<proyectoId>`
3. **Fiscal escanea QR**: llega a `src/app/campo/[id]/page.tsx`
4. **Fiscal ingresa PIN**: `POST /api/campo/auth` con `{ proyectoId, pin }`
5. **Servidor verifica**: busca `CampoAcceso` activo del proyecto → `bcrypt.compare(pin, pinHash)`
6. **Si OK**: genera JWT de campo firmado → `setCampoSession()` → cookie
7. **Redirección**: `redirect(/campo/[id]/bitacora)`
8. **Middleware de campo**: verifica JWT en cada request a `/campo/*`

### Seguridad del PIN

- El PIN nunca se almacena en texto plano
- bcrypt con factor 12 — resistente a tablas arcoíris y ataques de diccionario
- Rate limiting en el endpoint de auth para prevenir fuerza bruta
- El token de campo tiene scope limitado al proyectoId y expira en 12 horas

---

## 9. Seguridad

### Medidas implementadas

| Área | Medida |
|------|--------|
| Autenticación | JWT `HttpOnly` + `Secure` + `SameSite=Lax` |
| Contraseñas | bcrypt factor 12 |
| PINs de campo | bcrypt factor 12 |
| Rate limiting | In-memory sliding window en auth endpoints |
| CSRF | Next.js Server Actions incluyen protección CSRF por diseño |
| SQL Injection | Prevenido por Prisma ORM (queries parametrizadas) |
| XSS | React escapa automáticamente el output; no se usa dangerouslySetInnerHTML |
| HTTPS | En producción Vercel (demo); en local, el túnel Cloudflare provee HTTPS extremo a extremo |
| Roles | Verificación de rol en cada Server Action antes de ejecutar |
| Auditoría | Registro de acciones en tabla `AuditLog` |

### Variables de entorno requeridas

```env
DATABASE_URL=postgresql://...
NEXTAUTH_SECRET=<secreto-aleatorio-256-bits>
NEXTAUTH_URL=http://localhost:3000
CAMPO_SECRET=<secreto-aleatorio-independiente-256-bits>
SENTRY_DSN=<dsn-opcional>
```

---

## 10. Almacenamiento y backup

### Ubicación de datos en producción (Electron)

| Tipo | Ruta (Windows) | Ruta (macOS) |
|------|----------------|--------------|
| Base de datos PostgreSQL | `C:\ProgramData\TekoInnova\pg\data\` | `~/Library/Application Support/TekoInnova/pg/data/` |
| Archivos de configuración | `C:\ProgramData\TekoInnova\config\` | `~/Library/Application Support/TekoInnova/config/` |
| Logs de la aplicación | `C:\ProgramData\TekoInnova\logs\` | `~/Library/Application Support/TekoInnova/logs/` |

### Backup manual

El sistema genera un backup en formato:
- **JSON por tabla**: para portabilidad máxima
- **CSV por tabla**: para apertura en Excel
- **Dump PostgreSQL (.sql)**: para restauración completa

El archivo final es un `.zip` con fecha y hora en el nombre (ejemplo: `TEKOGA-backup-2026-04-13-14h30.zip`).

### Estrategia de backup recomendada para el cliente

1. **Backup semanal mínimo**: Copiar el archivo a un pendrive o disco externo
2. **Backup diario recomendado**: Copiar a Google Drive o similar
3. **Antes de actualizar**: Siempre generar un backup antes de instalar una nueva versión
4. **Testear la restauración**: Al menos una vez cada 3 meses, verificar que el backup se puede restaurar

---

## 11. Registro de auditoría

Todas las acciones de mutación importantes se registran en la tabla `AuditLog`:

```
AuditLog {
  id         : cuid
  usuarioId  : String (o null para acciones de campo)
  accion     : String  // "CREAR_PROYECTO", "MODIFICAR_MOVIMIENTO", etc.
  entidad    : String  // Nombre de la tabla afectada
  entidadId  : String  // ID del registro afectado
  datos      : JSON    // Snapshot de los datos antes/después
  ip         : String
  createdAt  : DateTime
}
```

El panel de administración (`/admin/audit`) permite a los Administradores revisar el historial completo de acciones.

---

## 12. Empaquetado Electron

### Proceso de build

```bash
npm run electron:build:win   # → release/TEKOGA-Setup-x.x.x.exe
npm run electron:build:mac   # → release/TEKOGA-x.x.x.dmg
```

### Qué incluye el instalador

- Binario Electron (Node.js embebido + Chromium mínimo)
- Servidor Next.js compilado (`.next/standalone`)
- Binario `cloudflared` para el túnel Cloudflare
- Icono e información de la aplicación
- Scripts de instalación y desinstalación

### Proceso de inicio del servidor (electron/main.cjs)

Al abrir TEKÓGA, `main.cjs`:
1. Verifica que PostgreSQL local esté iniciado (lo inicia si no está)
2. Ejecuta las migraciones de Prisma pendientes
3. Levanta el servidor Next.js en el puerto disponible (default: 3000)
4. Abre la ventana BrowserWindow apuntando a `http://localhost:3000`

### Actualizaciones

- Las actualizaciones se distribuyen como nuevo instalador descargable
- Plan Corporativo: `electron-updater` puede verificar y descargar actualizaciones en segundo plano desde un servidor de actualización de TekoInnova
- Antes de actualizar, el usuario recibe aviso y puede generar un backup

---

*Para consultas técnicas y de integración, contáctese con el equipo de desarrollo de TekoInnova:*  
*📧 dev@tekoinnova.com*  
*🌐 tekoinnova.com*

---

*TEKÓGA — Descripción Técnica del Sistema v1.0 · © 2026 TekoInnova · Confidencial*
