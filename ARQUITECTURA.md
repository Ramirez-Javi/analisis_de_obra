# TEKOINNOVA CMD — Arquitectura, Distribución y Plan de Producto

> Documento técnico y estratégico de referencia interna.  
> Actualizar cuando cambien decisiones de arquitectura o planes comerciales.  
> **Versión 1.0 · Abril 2026**

---

## Tabla de contenidos

1. [Visión del producto](#1-visión-del-producto)
2. [Stack tecnológico actual](#2-stack-tecnológico-actual)
3. [Modelo de distribución objetivo](#3-modelo-de-distribución-objetivo)
4. [Arquitectura de red completa](#4-arquitectura-de-red-completa)
5. [Dos escenarios de operación](#5-dos-escenarios-de-operación)
6. [Modo demo web](#6-modo-demo-web)
7. [Planes comerciales](#7-planes-comerciales)
8. [Hoja de ruta de desarrollo (Fases A–H)](#8-hoja-de-ruta-de-desarrollo)
9. [Decisiones técnicas tomadas](#9-decisiones-técnicas-tomadas)
10. [Preguntas pendientes de definir](#10-preguntas-pendientes-de-definir)

---

## 1. Visión del producto

**TekoInnova CMD** es un sistema de gestión integral para empresas constructoras.

Se distribuye como una **aplicación descargable** que se instala en un ordenador de la empresa (el "servidor local"). Desde ese servidor, todos los demás equipos de la empresa acceden a través de la red local (LAN/WiFi), sin necesidad de instalar nada adicional en cada computadora.

Para los trabajadores en campo (fiscales de obra, capataces), la app genera un código QR por proyecto. El trabajador lo escanea con su celular y accede a la Bitácora de la obra desde cualquier lugar con datos móviles.

**Principios clave:**
- Los datos de la empresa viven en el disco del cliente, no en servidores externos
- Sin suscripciones de base de datos en la nube
- Funciona sin internet para los usuarios de oficina
- Los trabajadores de campo sincronizan via internet solo cuando reportan

---

## 2. Stack tecnológico actual

| Capa | Tecnología |
|------|-----------|
| Framework | Next.js 16.2.2 (App Router) + React 19 |
| Lenguaje | TypeScript 5 |
| ORM | Prisma 7.6 |
| Base de datos (dev) | Neon PostgreSQL (nube) → **migrará a local** |
| Autenticación | NextAuth v5 beta · JWT · sesiones de 8 horas |
| UI | Tailwind CSS 4 · Lucide React · Sonner · Recharts |
| Empaquetado futuro | Electron + electron-builder |

### Módulos operativos (todos construidos)

| # | Módulo | Descripción |
|---|--------|-------------|
| 1 | Proyecto / Ficha | Datos de obra, equipo técnico, propietarios, planos |
| 2 | Presupuesto | Análisis de precios, cómputo métrico, catálogo de rubros |
| 3 | Cronograma | Planificación de tareas y avance de obra |
| 4 | Estado Financiero | Ingresos, egresos, facturas, flujo de caja |
| 5 | Mano de Obra | Registro de personal, cargos, costos |
| 6 | Logística | Planificación y seguimiento de recursos |
| 7 | Compras | Proveedores globales, cotizaciones |
| 8 | Inventario / As-Built | Recepción de bodega, instalación por ambiente |
| 9 | Bitácora de Obra | Diario de obra, FODA, personal del día, alertas de stock |
| 10 | Reportes | Consolidado de información por proyecto |

---

## 3. Modelo de distribución objetivo

### Situación actual (desarrollo)
```
Ordenador del desarrollador → Next.js → Neon (PostgreSQL en la nube ☁️)
```
Requiere internet. Los datos están en servidores externos. Solo válido para desarrollo.

### Objetivo (producción para clientes)
```
Ordenador del cliente → Electron → Next.js embebido → PostgreSQL local 💾
                    Todo en el mismo equipo. Sin internet. Sin nube.
```

| Aspecto | Actual | Objetivo |
|---------|--------|----------|
| Base de datos | Neon PostgreSQL (nube) | PostgreSQL embebido (disco del cliente) |
| Empaquetado | Vercel web | Instalador `.exe` Windows / `.dmg` Mac |
| Internet requerido | Sí, siempre | No (100% offline para oficina) |
| Datos | Servidores de Neon | `C:\ProgramData\TekoInnova\` |
| Actualizaciones | Automáticas en Vercel | `electron-updater` (según plan) |
| Instalación | Abrir navegador | Doble clic → siguiente → instalar |

### ¿Por qué PostgreSQL y no SQLite?
SQLite no soporta múltiples usuarios escribiendo simultáneamente. Con 5 personas en la oficina trabajando al mismo tiempo, SQLite causaría errores de "base de datos bloqueada". PostgreSQL está diseñado exactamente para este escenario.

---

## 4. Arquitectura de red completa

```
╔══════════════════════════════════════════════════════════════╗
║  EMPRESA CONSTRUCTORA (ejemplo: Caaguazú - Oficina central) ║
║                                                              ║
║  ┌─────────────────────────────────────────────────────┐    ║
║  │  ORDENADOR PRINCIPAL (el "servidor local")          │    ║
║  │  ─ Instalación completa de TekoInnova CMD           │    ║
║  │  ─ Next.js + PostgreSQL corriendo localmente        │    ║
║  │  ─ IP local: http://192.168.1.10:3000               │    ║
║  │  ─ TODOS los datos en su disco duro                 │    ║
║  └──────────────────┬──────────────────────────────────┘    ║
║                     │  Red local (LAN / WiFi de oficina)    ║
║         ┌───────────┼───────────────────┐                   ║
║         ▼           ▼                   ▼                   ║
║  [Director]  [Presupuestista]  [Admin Financiero]           ║
║  Abre su     Abre su          Abre su navegador             ║
║  navegador   navegador        → http://192.168.1.10:3000    ║
║  NO instala  NO instala       NO instala nada               ║
║  nada extra  nada extra       Acceso inmediato              ║
╚══════════════════════════════════════════════════════════════╝
                     │
                     │  Internet seguro
                     │  Cloudflare Tunnel (gratuito)
                     │  URL pública automática
              ┌──────┴──────────────────────────────┐
              ▼                                     ▼
  [Fiscal - Asunción]                 [Capataz - Encarnación]
  Escanea QR del proyecto              Escanea QR del proyecto
  Abre en su celular                   Abre en su celular
  → Solo ve la Bitácora de esa obra   → Solo ve la Bitácora
  Llena reporte diario                 Toma fotos → sube a Drive
  Datos sync en tiempo real             Pega enlace en Bitácora
```

### Cómo acceden los usuarios de oficina
1. El ordenador principal está encendido en la oficina
2. El panel de administración muestra su IP local: `http://192.168.1.10:3000`
3. El colega abre esa URL en su propio navegador
4. Ve el sistema completo con sus permisos asignados
5. **No instala nada. No necesita cuenta externa.**

### Cómo acceden los fiscales y capataces en campo
1. En cada proyecto existe el botón **"Generar acceso de campo"**
2. El sistema activa un Cloudflare Tunnel → genera URL pública segura
3. Crea un **código QR único para ese proyecto**
4. El funcionario de oficina envía el QR al fiscal (WhatsApp, email, etc.)
5. El fiscal lo escanea → llega directo a la Bitácora de su obra
6. Interfaz optimizada para móvil, usa sus datos móviles
7. Todo lo que escribe llega al servidor de la oficina en tiempo real

### Gestión de fotos en campo
- El fiscal toma fotos desde su celular
- Las sube a **Google Drive** o **OneDrive** (cualquiera que use)
- En la Bitácora existe un campo **"Enlace de fotos"** donde pega la URL
- Las fotos NO se almacenan en el servidor de la empresa (evita llenar el disco)

---

## 5. Dos escenarios de operación

La arquitectura está diseñada para funcionar correctamente en ambos escenarios.

---

### Escenario A — Servidor siempre disponible *(recomendado)*

**Situación**: El ordenador principal es un **desktop fijo** en la oficina. Está encendido en horario laboral (7:00–18:00 por ejemplo).

**Comportamiento del sistema:**
- Cloudflare Tunnel activo permanentemente mientras el PC está encendido
- Los fiscales pueden enviar reportes en cualquier momento del horario laboral
- Máxima fiabilidad, sin configuración especial
- Datos siempre en tiempo real entre oficina y campo

**Requisito del cliente:** Mantener el servidor encendido durante el horario de trabajo. Idealmente con un UPS (batería de respaldo) para cortes de luz breves.

**Ideal para:** Empresas con oficina fija, desktop dedicado al sistema.

---

### Escenario B — Servidor puede apagarse *(modo resiliente)*

**Situación**: El ordenador principal es una **laptop** que puede estar apagada, en viaje, o sin internet.

**Comportamiento del sistema:**
- La interfaz móvil del fiscal entra en **modo offline automáticamente**
- El fiscal llena la Bitácora sin saber que el servidor no está disponible
- Los datos se guardan temporalmente en el celular (IndexedDB del navegador)
- Cuando el servidor vuelve a estar disponible, la app **sincroniza automáticamente**
- El fiscal ve en pantalla: `📶 Sin conexión — guardando localmente`
- Ningún dato se pierde

**Ideal para:** Empresas donde el responsable del sistema trabaja con laptop, o zonas con cortes de luz frecuentes.

**Nota técnica para developers:** Este escenario requiere:
- Service Worker en la interfaz móvil de Bitácora
- Cola de operaciones offline almacenada en `IndexedDB`
- Endpoint de sincronización diferida en el servidor
- Resolución de conflictos (si el mismo campo se edita offline desde dos dispositivos)

---

## 6. Modo demo web

Disponible en **tekoinnova.com** para que el usuario pruebe el sistema antes de comprarlo.

### Descripción
- Corre en Vercel (no requiere descarga)
- Datos de ejemplo pre-cargados (empresa ficticia, proyectos de muestra)
- Acceso a todos los módulos y funciones del sistema
- Reset automático diario (los datos de demo se restauran cada 24 horas)

### Restricciones aplicadas

| Función | Demo | Versión comprada |
|---------|:----:|:----------------:|
| Todos los módulos | ✅ | ✅ |
| Crear y editar datos | ✅ | ✅ |
| Ver reportes | ✅ | ✅ |
| **Exportar a CSV** | ❌ Bloqueado | ✅ |
| **Exportar a PDF** | ❌ Bloqueado | ✅ |
| **Imprimir** | ✅ Máx. 3 veces · con marca de agua | ✅ Sin límite |
| Acceso de campo (QR) | ❌ | ✅ según plan |
| Datos persistentes | ❌ (reset diario) | ✅ permanentes |

### Implementación técnica del límite de impresión
- Contador almacenado en `localStorage` del navegador del visitante
- CSS `@media print` inyecta la marca de agua automáticamente
- Al intentar imprimir por 4ª vez: modal informando el límite con llamada a acción hacia los planes de compra
- No tiene sentido proteger esto contra usuarios técnicos (pueden burlar localStorage); el objetivo es la fricción natural para usuarios normales

---

## 7. Planes comerciales

### Estructura de planes

| | **Plan Básico** | **Plan Profesional** | **Plan Plus** | **Plan Corporativo** |
|-|:---------------:|:--------------------:|:-------------:|:--------------------:|
| Servidor local | ✅ 1 PC | ✅ 1 PC | ✅ 1 PC | ✅ 1 PC |
| Conexiones LAN simultáneas | Por definir | Por definir | Por definir | Por definir |
| Acceso de campo (QR + PIN Bitácora) | Por definir | ✅ incluido | ✅ incluido | ✅ incluido |
| Auto-actualizaciones | ✅ gratuitas | ✅ gratuitas | ✅ gratuitas | ✅ gratuitas |
| Dispositivos móviles campo | Por definir | Por definir | Por definir | Ilimitado |
| Instalador Windows (.exe) | ✅ | ✅ | ✅ | ✅ |
| Instalador Mac (.dmg) | ✅ | ✅ | ✅ | ✅ |
| Backup manual (botón único) | ✅ | ✅ | ✅ | ✅ |
| Soporte técnico | Email 24–48hs | Email 24–48hs | Email <24hs | WhatsApp + email + contacto directo |
| Precio | **Por definir** | **Por definir** | **Por definir** | **Por definir** |
| Modelo de pago | Mensual / Anual | Mensual / Anual | Mensual / Anual | Mensual / Anual |

### Período de prueba
- **10 días gratuitos** sin necesidad de licencia
- Durante la prueba: todos los módulos disponibles
- Restricción de prueba: los reportes e impresiones incluyen **marca de agua** `"VERSIÓN DE PRUEBA — TekoInnova CMD"`
- Al vencer los 10 días: acceso bloqueado hasta activar una licencia comprada

### Acceso de campo — Fiscales con PIN
- Los fiscales son **creados como usuarios** desde el panel de administración de la oficina
- Al crear el usuario fiscal, el ADMIN le asigna un **PIN único** (4–6 dígitos)
- El fiscal accede escaneando el QR del proyecto + ingresando su PIN
- El PIN identifica al fiscal: los registros de bitácora quedan firmados con su nombre
- Sin PIN válido, el QR no da acceso a la bitácora
- El ADMIN puede cambiar o revocar el PIN desde el panel sin eliminar el historial

### Backup integrado
- La app incluye un **botón "Copia de Seguridad"** en el panel de administración
- Un solo clic exporta todos los proyectos, módulos y archivos adjuntos en un archivo `.zip`
- El archivo contiene los datos en formato JSON + CSV por tabla para portabilidad
- Plan Corporativo: backup automático programado (diario a las 22:00, configurable)

### Actualizaciones
- **Todos los planes** reciben actualizaciones de forma **gratuita**
- Las actualizaciones se instalan de forma manual descargando la nueva versión (todos los planes)
- Plan Corporativo: actualizaciones automáticas en segundo plano (`electron-updater`)

### Sistema de licencias (técnico)
- Al instalarse, la app genera un **ID único de máquina** (hash del hardware)
- El cliente recibe una **clave de activación** al comprar
- La clave contiene: plan, límite de conexiones LAN, fecha de vencimiento
- La verificación es **100% offline** — no llama a ningún servidor externo
- Tecnología: criptografía asimétrica (clave privada en tu servidor → clave pública embebida en la app)
- Si la licencia vence o es inválida: los módulos de exportación se bloquean, pero los datos siguen accesibles

---

## 8. Hoja de ruta de desarrollo

### FASE A — Base funcional ✅ COMPLETO
Todos los módulos construidos, sistema de usuarios y permisos, autenticación, multi-usuario, bitácora con FODA, inventario As-Built.

---

### FASE B — PostgreSQL local + instalador
**Objetivo**: Archivo descargable que instala y corre sin internet.

Tareas:
- Modificar `prisma/schema.prisma`: cambiar `provider = "postgresql"` a PostgreSQL embebido (bundleado en el instalador)
- Eliminar `@prisma/adapter-pg` y `PrismaPg` en `src/lib/prisma.ts` — Prisma maneja PostgreSQL nativo
- Crear `electron/main.js`: levanta el servidor Next.js internamente al abrir la app
- Configurar `electron-builder` en `package.json` para generar `.exe` (Windows) y `.dmg` (Mac)
- Wizard de primer arranque: configurar nombre de empresa, crear usuario administrador
- Ruta de datos: `C:\ProgramData\TekoInnova\` (Windows) / `~/Library/Application Support/TekoInnova/` (Mac)

---

### FASE C — Acceso LAN
**Objetivo**: Todos los equipos de la oficina trabajan simultáneamente.

Tareas:
- El panel de administración detecta la IP local del servidor automáticamente
- Muestra: *"Invitá a tus colegas: abrí http://192.168.1.10:3000 en su computadora"*
- Genera un QR de acceso LAN para escanear desde otro dispositivo
- Nada adicional que instalar en los equipos que se conectan

---

### FASE D — Acceso de campo con QR
**Objetivo**: Fiscales y capataces reportan desde el celular en cualquier obra.

Tareas:
- Botón **"Generar acceso de campo"** en la página de cada proyecto
- Activa `cloudflared` (Cloudflare Tunnel) embebido como binario en la app
- Genera URL pública tipo `obra-xyz.trycloudflare.com`
- Genera código QR con esa URL + identificador del proyecto
- Interfaz móvil simplificada para Bitácora: optimizada para pantalla chica, táctil, un solo módulo visible
- Campo "Enlace de fotos" con validación de URL (para Drive/OneDrive)

---

### FASE E — Sistema de licencias y planes
**Objetivo**: Modelo de negocio funcional con tiers controlados.

Tareas:
- Panel web administrativo (solo para TekoInnova): generación de claves de activación
- Wizard de activación en la app al primer arranque o cuando vence la prueba
- Límite dinámico de conexiones LAN según plan (verificado en proxy.ts al conectar)
- Dashboard en tu web: ver clientes activos, licencias vendidas, expiradas

---

### FASE F — Auto-actualización *(Plan Premium)*
**Objetivo**: Clientes premium siempre en la última versión sin acción manual.

Tareas:
- Configurar `electron-updater` apuntando a GitHub Releases o bucket propio
- Al abrir la app: verificación silenciosa de versión disponible
- Descarga en segundo plano (no interrumpe el trabajo)
- Notificación: *"Nueva versión disponible. Se instalará al cerrar la app."*
- Notas de versión visibles en la notificación

---

### FASE G — Modo offline para campo + sync diferida *(Escenario B)*
**Objetivo**: Fiabilidad total aunque el servidor de la oficina esté apagado.

Tareas:
- Service Worker registrado en la interfaz móvil de Bitácora
- Cola de operaciones offline en `IndexedDB` del celular
- Al recuperar conexión: sync automática con el servidor, con resolución de duplicados
- Indicador visual de estado: `🟢 Conectado` / `🟡 Sin conexión — guardando localmente`
- Historial de entradas pendientes de sincronizar visible para el usuario

---

### FASE H — Modo demo web
**Objetivo**: Herramienta de ventas sin demos manuales.

Tareas:
- Deploy en Vercel con datos de ejemplo pre-cargados (empresa ficticia completa)
- Middleware que detecta sesión demo y bloquea export CSV/PDF
- CSS `@media print` con marca de agua: *"DEMO — TekoInnova CMD"*
- Contador de impresiones en `localStorage`
- Modal de conversión al alcanzar el límite (con links a los planes)
- Script de reset automático diario en Vercel Cron

---

## 9. Decisiones técnicas tomadas

| Decisión | Alternativa descartada | Razón |
|---------|----------------------|-------|
| PostgreSQL embebido | SQLite | SQLite no soporta múltiples escrituras simultáneas (varios usuarios en oficina) |
| Cloudflare Tunnel | VPN · IP estática · ngrok | Sin configuración de red, gratuito, seguro, funciona detrás de cualquier router |
| Electron | PWA instalable | Electron permite PostgreSQL embebido, mayor control del sistema, menú nativo, actualizador |
| Licencia offline (criptografía) | Licencia validada online | Sin dependencia de internet para funcionar a diario |
| Sync diferida (IndexedDB) | Solo online para campo | Garantiza datos en zonas con señal intermitente o servidor apagado |
| Fotos en Drive/OneDrive (enlace) | Fotos subidas al servidor | Evita llenar el disco del cliente con archivos pesados; delega el almacenamiento a servicios gratuitos que ya usan |
| Marca de agua en demo | Funciones demo paralelas | Menor complejidad; el usuario ve el producto real sin modificar el código core |

---

## 10. Decisiones de producto — Resueltas

Todas las preguntas originales han sido respondidas por el equipo de producto.

| # | Pregunta | Decisión |
|---|----------|----------|
| 1 | Cantidad de conexiones LAN por plan | ⏳ Pendiente de definir (4 planes: Básico / Profesional / Plus / Corporativo) |
| 2 | Precio y modelo de pago | Suscripción mensual y anual. Precios a definir comercialmente |
| 3 | Soporte técnico | Básico/Profesional: email 24–48hs · Plus: email <24hs · Corporativo: WhatsApp + email + contacto directo |
| 4 | Actualizaciones | **Gratuitas para todos los planes**. Corporativo: automáticas vía electron-updater |
| 5 | Backup | **Botón único** en panel admin exporta TODO en .zip. Corporativo: backup automático diario |
| 6 | Acceso fiscales | **QR + PIN único por fiscal**. Fiscales se crean como usuarios desde la oficina. El ADMIN asigna el PIN |
| 7 | Datos demo | Empresa ficticia **TEKOGA S.A. — Innovación en Construcción** con datos completos en todos los módulos |
| 8 | Instalador Mac | **Incluido en todos los planes** (.dmg para macOS) |
| 9 | Período de prueba | **10 días gratuitos** con marca de agua en reportes e impresiones |

### Pendiente aún
- [ ] **Conexiones LAN por plan**: definir límites exactos (ej. Básico=3, Profesional=6, Plus=10, Corporativo=ilimitado)
- [ ] **Precios exactos**: tarifa mensual y anual por plan
- [ ] **Cantidad de usuarios** y **dispositivos de campo** por plan

---

*Este documento debe mantenerse actualizado a medida que avanza el desarrollo y se toman decisiones de producto.*
