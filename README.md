# TekoInnova CMD — Sistema Integral de Gestión de Obras

> **Versión 1.0 · Abril 2026**  
> Sistema de gestión integral para empresas y estudios de arquitectura e ingeniería de la construcción.

---

## ¿Qué es TekoInnova CMD?

**TekoInnova CMD** es un sistema de información completo, diseñado específicamente para empresas constructoras, estudios de arquitectura y oficinas de ingeniería que necesitan gestionar sus proyectos de construcción de forma profesional, ordenada y eficiente.

El sistema centraliza en un único lugar toda la información de cada obra: desde el presupuesto inicial hasta el pago final al último proveedor, pasando por el control diario de avances, el registro de mano de obra, el inventario de materiales y el libro de obra.

**Moneda nativa:** Guaraní paraguayo (Gs.)

---

## ¿Para quién es?

| Perfil | Qué hace en el sistema |
|--------|------------------------|
| **Director de Obra** | Supervisa el avance global, aprueba presupuestos, revisa el estado financiero |
| **Arquitecto / Ingeniero** | Elabora presupuestos APU, planifica cronogramas, redacta bitácoras |
| **Administrador financiero** | Registra cobros, controla pagos a proveedores, revisa flujo de caja |
| **Presupuestista** | Arma análisis de precios unitarios, genera reportes para clientes |
| **Fiscal de obra** | Registra el diario de obra desde el celular (bitácora de campo) |
| **Capataz / Maestro mayor** | Controla recepción de materiales en bodega, as-built de instalaciones |

---

## ¿Qué problema resuelve?

Sin un sistema, las empresas constructoras gestionan su información dispersa en:
- Planillas Excel independientes para presupuesto, cronograma y flujo de caja
- Libretas o WhatsApp para el diario de obra
- Carpetas físicas para contratos y planillas de cuadrillas
- Correos o fotos para el seguimiento de proveedores

Esto genera:
- Presupuestos que no coinciden con lo cobrado al cliente
- Pagos a proveedores sin saber cuánto queda por pagar
- Sin trazabilidad de qué material se instaló en qué ambiente
- Bitácoras incompletas que no tienen valor legal
- Imposibilidad de ver la rentabilidad real de cada obra

**TekoInnova CMD resuelve todos estos problemas** conectando todos los módulos entre sí para que la información fluya automáticamente.

---

## Tabla de contenidos

1. [Arquitectura del sistema](#1-arquitectura-del-sistema)
2. [Módulo 1 — Gestión de Proyectos y Ficha Técnica](#2-módulo-1--gestión-de-proyectos-y-ficha-técnica)
3. [Módulo 2 — Cómputo y Presupuesto APU](#3-módulo-2--cómputo-y-presupuesto-apu)
4. [Módulo 3 — Cronograma y Curva S](#4-módulo-3--cronograma-y-curva-s)
5. [Módulo 4 — Estado Financiero](#5-módulo-4--estado-financiero)
6. [Módulo 5 — Gestión de Mano de Obra](#6-módulo-5--gestión-de-mano-de-obra)
7. [Módulo 6 — Maquinaria y Logística](#7-módulo-6--maquinaria-y-logística)
8. [Módulo 7 — Proveedores y Compras](#8-módulo-7--proveedores-y-compras)
9. [Módulo 8 — Inventario y As-Built](#9-módulo-8--inventario-y-as-built)
10. [Módulo 9 — Bitácora de Obra](#10-módulo-9--bitácora-de-obra)
11. [Módulo 10 — Reportes y Exportaciones](#11-módulo-10--reportes-y-exportaciones)
12. [Sistema de usuarios y permisos](#12-sistema-de-usuarios-y-permisos)
13. [Flujo de trabajo completo](#13-flujo-de-trabajo-completo)
14. [Ventajas y beneficios del sistema](#14-ventajas-y-beneficios-del-sistema)
15. [Stack tecnológico](#15-stack-tecnológico)

---

## 1. Arquitectura del sistema

El sistema sigue una arquitectura **Hub & Spoke**: cada **Proyecto** es el núcleo central desde el cual se accede a todos los módulos. Un mismo equipo puede gestionar múltiples proyectos simultáneamente, y la información de cada uno está completamente aislada.

```
                        ┌─────────────────┐
                        │   EMPRESA        │
                        │  (datos globales) │
                        └────────┬─────────┘
                                 │
                    ┌────────────▼────────────┐
                    │       PROYECTO           │
                    │  (núcleo de información) │
                    └──────────┬──────────────┘
                               │
       ┌───────────────────────┼────────────────────────┐
       │           │           │           │             │
  ┌────▼────┐ ┌────▼────┐ ┌───▼────┐ ┌───▼────┐  ┌────▼────┐
  │Presupuesto│ │Cronograma│ │Financiero│ │ManoObra│  │Bitácora │
  └────┬────┘ └─────────┘ └────────┘ └────────┘  └─────────┘
       │
  ┌────▼────┐ ┌─────────┐ ┌────────┐ ┌────────┐  ┌─────────┐
  │Logística│ │Compras  │ │Inventario│ │Reportes│  │ Ficha   │
  └─────────┘ └─────────┘ └────────┘ └────────┘  └─────────┘
```

**Integración entre módulos:**
- Los rubros del **Presupuesto** se sincronizan automáticamente al **Cronograma**
- El **Cronograma** alimenta la Curva S de la **Mano de Obra**
- Las **Facturas de Compras** se vinculan al **Estado Financiero**
- La **Bitácora** consume las alertas de stock del **Inventario**
- Los **Reportes** consolidan datos de todos los módulos

---

## 2. Módulo 1 — Gestión de Proyectos y Ficha Técnica

### ¿Para qué sirve?

Es el punto de entrada de toda la información de una obra. Centraliza los datos técnicos, legales, contractuales, organizacionales y documentales del proyecto en una ficha completa y estructurada.

### ¿Qué contiene?

**Datos generales del proyecto:**
- Código único de obra (ej. `PRY-2026-001`)
- Nombre, descripción y ubicación
- Superficies: a construir (m²) y del terreno
- Fechas de inicio y finalización estimada, duración en semanas
- Estado de la obra: `Anteproyecto → Borrador → Proyecto Ejecutivo → Contrato Confirmado → En Ejecución → Finalizado`
- Objeto del contrato, forma de pago, responsable de obra

**Propietarios:**
- Datos completos (nombre, DNI, teléfono, email, dirección)
- Porcentaje de participación si hay copropiedad
- Soporte para múltiples propietarios por proyecto

**Equipo técnico:**
- Director de obra, arquitecto, ingenieros estructural y de instalaciones, maestro mayor
- Matrícula profesional, teléfono y email de cada integrante

**Índice de láminas y planos:**
- Registro de planos por código, título y disciplina (arquitectura, estructura, instalaciones)
- Revisión y enlace al archivo digital

**Reuniones de proyecto:**
- Agenda, acta y estado (`Programada / Realizada / Cancelada`)
- Representantes presentes
- CRUD completo con historial cronológico

**Anotaciones / Bitácora legal:**
- Notas clasificadas por categoría (reunión, modificación, ajuste, nota legal)
- Autor y marca de tiempo automática

**Aprobaciones contractuales:**
- Fechas y firmantes de aprobación de planos y presupuesto
- Datos del revisor/fiscal externo
- Plazos contractuales y monto del contrato
- Observaciones por fase de aprobación

### ¿Qué nos da?

- Ficha técnica completa lista para imprimir o presentar a autoridades
- Historial legal de todas las decisiones tomadas sobre la obra
- Trazabilidad de quién aprobó qué y cuándo
- Elimina la búsqueda de datos en múltiples documentos dispersos

---

## 3. Módulo 2 — Cómputo y Presupuesto APU

### ¿Para qué sirve?

Genera el presupuesto de la obra mediante el método profesional de **Análisis de Precios Unitarios (APU)**. Cada rubro de trabajo tiene una "receta" exacta de materiales y mano de obra, con lo que el precio unitario se calcula automáticamente desde los costos reales.

### ¿Cómo funciona?

El sistema cuenta con un **catálogo maestro** de rubros constructivos precargados con precios en guaraníes, organizados por categorías:

- Trabajos preliminares
- Estructuras de hormigón armado (zapatas, columnas, vigas, losas)
- Mampostería y revoques
- Cubiertas e impermeabilizaciones
- Instalaciones eléctricas, sanitarias y especiales
- Terminaciones (pisos, cielorrasos, carpinterías)
- Pinturas y revestimientos

**Flujo de trabajo:**
1. El presupuestista selecciona rubros del catálogo y los agrega al proyecto
2. Ingresa la **cantidad de obra** (el cómputo métrico), por ejemplo: "154 m² de losa"
3. El sistema calcula automáticamente el costo total de ese rubro
4. Los precios de cada insumo son editables por proyecto sin alterar el catálogo global

**Estructura de un rubro (receta APU):**

```
RUBRO: Losa de hormigón fck=21MPa  |  Unidad: m³  |  Cantidad: 45.6 m³
├── Cemento Portland 50kg   → 8.5 bolsas × Gs. 35.000 = Gs. 297.500
├── Arena gruesa (m³)       → 0.45 m³ × Gs. 95.000  = Gs. 42.750
├── Piedra triturada (m³)   → 0.85 m³ × Gs. 115.000 = Gs. 97.750
├── Varilla ø12mm (kg)      → 8.2 kg  × Gs. 8.500   = Gs. 69.700
└── Mano de obra (oficial)  → 0.90 HH × Gs. 45.000  = Gs. 40.500
    ─────────────────────────────────────────────────────────────
    PRECIO UNITARIO (m³):  Gs. 548.200
    SUBTOTAL (45.6 m³):    Gs. 24.997.920
```

### Funciones clave:

| Función | Descripción |
|---------|-------------|
| Catálogo de rubros | Banco de datos con rubros constructivos ya cargados |
| Recetas editables | Los insumos de cada rubro se pueden modificar por proyecto |
| % de pérdida | Se aplica a la cantidad real de materiales (no al precio) |
| Calculadora integrada | Flotante y arrastrable, soporta teclado físico completo |
| Precio "ciego" | El reporte para el cliente no muestra el desglose de costos |
| Imprevistos y ganancia | % configurables que se suman al costo directo |
| Totalizadores | Total materiales · Total MO · Costo directo · Precio final al cliente |

### ¿Qué nos da?

- Presupuestos profesionales elaborados 80% más rápido
- Precio unitario calculado desde costos reales (no estimado)
- Control de rentabilidad: sé exactamente cuánto se gana en cada rubro
- Reporte para el cliente sin revelar el margen de ganancia
- Actualización de precios sin rehacer el presupuesto desde cero

---

## 4. Módulo 3 — Cronograma y Curva S

### ¿Para qué sirve?

Planifica la ejecución de la obra en el tiempo y visualiza el avance real versus el planificado. Es la herramienta de control de tiempos de la obra.

### ¿Cómo funciona?

Los rubros del presupuesto se sincronizan automáticamente al cronograma. El director de obra asigna a cada rubro su fecha de inicio y duración estimada. El sistema genera el **diagrama de Gantt** y la **Curva S** de avance.

**Datos por tarea:**
- Día de inicio relativo al comienzo del proyecto
- Duración en días
- Fecha real de inicio y fin (se registra conforme avanza la obra)
- Porcentaje de avance real (0–100%)

**Visualizaciones:**

**Diagrama de Gantt interactivo:**
- Cabecera con meses, semanas y días individuales
- Barra gris = plazo planificado
- Barra de color = avance real ejecutado
- Fines de semana visualmente diferenciados

**Curva S:**
- Eje X: semanas del proyecto
- Línea azul: porcentaje acumulado planificado semana a semana
- Línea verde: porcentaje acumulado real registrado
- La brecha entre ambas líneas muestra cuánto se adelanta o atrasa la obra

**Registro de avance:**
- Se registra la fecha, el porcentaje real y observaciones
- Historial de todas las fechas de control

### ¿Qué nos da?

- Identificación temprana de atrasos antes de que sean críticos
- Comunicación visual clara del avance a propietarios y financiadores
- Base documentada para justificar ampliaciones de plazo contractuales
- Sincronización automática con el presupuesto: si se agrega un rubro, aparece en el cronograma

---

## 5. Módulo 4 — Estado Financiero

### ¿Para qué sirve?

Es el **libro mayor contable simplificado** de la obra. Registra cada peso que entra (cobros al cliente) y cada peso que sale (pagos a proveedores, cuadrillas, honorarios) con trazabilidad completa de medio de pago y comprobante.

### ¿Qué registra?

**Tipos de movimiento:**
| Tipo | Descripción |
|------|-------------|
| Ingreso del cliente | Cobros por avance de obra, anticipos, cuotas |
| Egreso a proveedor | Pago de facturas de materiales |
| Egreso a personal | Pago de cuadrillas y trabajadores |
| Egreso a maquinaria | Alquiler de equipos, combustible, transporte |
| Egreso honorarios | Honorarios profesionales de arquitectos o ingenieros |
| Egreso caja chica | Gastos menores sin factura formal |
| Egreso otro | Cualquier egreso que no encaja en las categorías anteriores |

**Formulario de registro:**
- Fecha, concepto detallado, beneficiario o pagador
- Monto en guaraníes
- Número de comprobante o recibo
- Quién autorizó el pago
- Medio de pago: **Efectivo / Cheque / Transferencia / Giro / Otro**

**Datos adicionales por medio de pago:**
- *Cheque:* banco, número de cheque, fecha de emisión
- *Transferencia/Giro:* banco, número de operación

### KPIs en tiempo real:

```
┌─────────────────┬──────────────────┬───────────────────┬──────────────────┐
│  Total Cobrado  │  Total Gastado   │  Saldo de Caja    │  Saldo por Cobrar │
│  Gs. 85.000.000 │  Gs. 62.400.000  │  Gs. 22.600.000   │  Gs. 35.000.000   │
└─────────────────┴──────────────────┴───────────────────┴──────────────────┘
```

- **Total cobrado:** suma de todos los ingresos del cliente
- **Total gastado:** suma de todos los egresos
- **Saldo de caja:** lo que queda disponible en este momento
- **Saldo por cobrar:** diferencia entre el monto del contrato y lo ya cobrado

**Vistas disponibles:**
- Libro mayor cronológico con todos los movimientos
- Gráfico de barras de egresos por categoría

### ¿Qué nos da?

- Saber en todo momento cuánto dinero tiene la obra y cuánto se le debe al cliente
- Evitar sorpresas de "falta liquidez para pagar la cuadrilla"
- Trazar cada pago a un comprobante específico
- Detectar categorías de gasto que están descontroladas
- Base para rendir cuentas al propietario con respaldo documentado

---

## 6. Módulo 5 — Gestión de Mano de Obra

### ¿Para qué sirve?

Administra los contratos con sub-contratistas y cuadrillas de trabajo. Controla los pagos realizados, la retención de garantía y el avance de cada contratista.

### ¿Qué gestiona?

**Contrato de cuadrilla:**
- Descripción del trabajo adjudicado
- Jefe de cuadrilla y su contacto
- Monto total pactado (Gs.)
- Porcentaje de retención de garantía (para liberar al finalizar la obra)
- Estado del contrato: `Activo / Pausado / Finalizado / Rescindido`
- Fechas de inicio y fin estimado

**Personal de la cuadrilla:**
- Nombre, apellido, DNI y teléfono de cada trabajador
- Rol: Oficial / Medio oficial / Ayudante / Especialista

**Pagos realizados:**
- Monto, fecha y descripción de cada pago
- Número de comprobante
- Cálculo automático: cuánto se pagó, qué porcentaje del contrato representa y cuánto falta

**Bitácora del contratista:**
- Registro de actividades diarias, inconvenientes y soluciones por parte del maestro mayor

### Cálculos automáticos:

```
Contrato total:          Gs. 24.500.000
Pagos realizados:        Gs. 14.700.000  (60%)
Retención acumulada:     Gs.  1.470.000  (10%)
SALDO PENDIENTE:         Gs.  9.800.000  (40%)
```

**Curva S por contratista:**
- Gráfico con línea de avance planificado y puntos de avance real registrado en cada pago
- Visualiza si el contratista está en ritmo, adelantado o atrasado

### ¿Qué nos da?

- Saber cuánto se debe a cada cuadrilla sin hacer cuentas en papel
- Control de la retención de garantía para no pagarla antes de tiempo
- Historial documentado de todos los pagos ante cualquier conflicto laboral
- Registro de identidad (DNI) de todos los trabajadores presentes en la obra
- Detección temprana de contratistas que se están atrasando

---

## 7. Módulo 6 — Maquinaria y Logística

### ¿Para qué sirve?

Registra y controla todos los **costos indirectos** de la obra: aquellos que no son materiales ni mano de obra directa, pero que sí impactan en la rentabilidad. Equipos, fletes, honorarios, seguros y gastos administrativos.

### Tipos de costo:

| Tipo | Ejemplos |
|------|---------|
| **Flete** | Transporte de materiales, camiones, logística de entrega |
| **Alquiler de maquinaria** | Hormigonera, grúa, retroexcavadora, elevador de materiales |
| **Honorarios del proyecto** | Dirección de obra, inspección técnica, certificaciones |
| **Gastos administrativos** | Habilitaciones, planos municipales, tasas, papelería |
| **Seguro** | Seguro de obra, ART, responsabilidad civil |
| **Otro** | Cualquier costo indirecto no categorizado |

**Por cada ítem se registra:**
- Descripción detallada
- Unidad: Horas / Días / Meses / Viajes / Global / Unidad
- Cantidad y costo unitario → subtotal calculado
- Proveedor del servicio
- Número de comprobante y fecha

**Totalizadores:**
```
Total Equipos/Maquinaria:   Gs. 4.200.000
Total Gastos Logísticos:    Gs. 1.850.000
──────────────────────────────────────────
TOTAL INDIRECTO:            Gs. 6.050.000
```

### ¿Qué nos da?

- Visibilidad completa del costo real de la obra (directo + indirecto)
- Identificar qué porcentaje del presupuesto se va en costos indirectos
- Controlar que el alquiler de maquinaria no supere lo presupuestado
- Respaldo para incluir estos costos en análisis de rentabilidad y presupuestos futuros

---

## 8. Módulo 7 — Proveedores y Compras

### ¿Para qué sirve?

Gestiona el directorio de proveedores de la empresa y controla las facturas emitidas por cada proveedor en cada proyecto, con control de cuentas por pagar.

### Sub-módulo A: Directorio Global de Proveedores

Datos del proveedor registrado a nivel empresa (disponible para todos los proyectos):

| Dato | Descripción |
|------|-------------|
| Razón social y RUC | Datos fiscales para emisión de órdenes de compra |
| Vendedores | Nombres de los comerciales de contacto |
| Contacto principal | Nombre, teléfono y email del interlocutor habitual |
| Datos bancarios | Banco, tipo de cuenta, número de cuenta para transferencias |
| Observaciones | Condiciones especiales, descuentos habituales, notas |
| Estado activo/inactivo | Para deshabilitar proveedores sin eliminar su historial |

### Sub-módulo B: Facturas por Proyecto

Por cada proyecto, se registran las facturas recibidas de cada proveedor:

**Formulario de factura:**
- Número de factura (formato `001-001-0001234`)
- Fecha de emisión y fecha de vencimiento
- Concepto detallado
- Monto en guaraníes
- Observaciones adicionales

**Estados de factura:**
- 🟡 **Pendiente** — recibida, aún no pagada
- 🟢 **Pagada** — abonada (puede vincularse al módulo financiero)
- 🔴 **Anulada** — anulada por error o devolución

**Vista consolidada por proveedor en el proyecto:**
```
PROVEEDOR: Ferreterías del Norte
├── Factura 001-001-0004521  →  Gs. 3.450.000  [PAGADA]
├── Factura 001-001-0004788  →  Gs. 1.890.000  [PENDIENTE]  ← vence 15/04
└── Factura 001-001-0005102  →  Gs. 2.100.000  [PENDIENTE]
    ──────────────────────────────────────────────────────
    Total facturado:  Gs. 7.440.000
    Total pagado:     Gs. 3.450.000
    SALDO PENDIENTE:  Gs. 3.990.000  ⚠️
```

### ¿Qué nos da?

- Nunca más "¿a este proveedor le pagamos la última factura?"
- Control de vencimientos para evitar intereses y corte de crédito
- Historial de compras por proveedor para negociar descuentos
- Base de datos de proveedores lista para el próximo proyecto
- Los pagos pendientes alimentan automáticamente el estado financiero

---

## 9. Módulo 8 — Inventario y As-Built

### ¿Para qué sirve?

Controla el **stock de materiales** en obra y registra la **instalación As-Built**: qué material, de qué marca y lote, se instaló exactamente en qué ambiente. Es el módulo de trazabilidad y bodega.

### Sub-módulo A: Recepción de Bodega

Cada vez que llega un material a la obra, se registra:

| Campo | Descripción |
|-------|-------------|
| Material | Seleccionado del catálogo maestro |
| Cantidad recibida | Con su unidad (m², kg, bolsas, litros…) |
| Proveedor | Quién entregó |
| N° de remisión | Número del documento del proveedor |
| Marca y modelo/SKU | Datos del producto recibido |
| N° de lote | Para trazabilidad de calidad |
| Especificación técnica | Para materiales a granel ("Hormigón fck=21MPa", "Arena 4ta") |
| Responsable receptor | El capataz o encargado que recibió la entrega |

### Sub-módulo B: Registro de Instalación (As-Built)

Por cada material que se instala en la obra:

| Campo | Descripción |
|-------|-------------|
| Ambiente | "Dormitorio 1", "Baño Suite", "Cocina", "Exterior Norte" |
| Fecha de instalación | Cuándo se colocó |
| Cantidad instalada | Cuánto se usó |
| Dosificación/mezcla | "Mezcla 1:3 + aditivo impermeabilizante" |
| Mecanismo de instalación | "Doble encolado", "Vaciado con bomba", "Grapado" |
| Lote utilizado | Qué partida de materiales se instaló aquí |

### Alertas de stock automáticas:

El sistema calcula en tiempo real:
```
Material: Cerámico 60×60 Blanco (m²)
  Recibido:         450 m²
  Instalado:        287 m²
  Stock actual:     163 m²  ✅
  Tasa de consumo:  12.4 m²/día
  Días restantes:   ≈ 13 días  ⚠️  REPONER PRONTO
```

### ¿Qué nos da?

- Saber cuántos materiales quedan antes de que la obra se detenga por falta de stock
- Registro legal de qué material se instaló en cada lugar (garantía y certificación)
- Trazabilidad de lotes para reclamos de garantía a fabricantes
- Reducción de robos y mermas no justificadas
- Base para el "Manual del Propietario" y la documentación As-Built de la obra

---

## 10. Módulo 9 — Bitácora de Obra

### ¿Para qué sirve?

Es el **libro diario de obra** en formato digital. Registra cada jornada con información técnica, climática, análisis de problemas (FODA) y personal presente. Tiene valor legal y sirve como respaldo ante conflictos contractuales.

### Estructura de cada entrada diaria:

**Encabezado de jornada:**
| Campo | Descripción |
|-------|-------------|
| Fecha | Fecha de la jornada |
| Turno | Mañana / Tarde / Completo |
| Hora inicio y fin | "07:00" → "17:30" |
| Clima | Soleado / Nublado / Lluvioso / Ventoso |
| Temperatura | Grados Celsius |

**Descripción de actividades:**
- Resumen narrativo de todo lo ejecutado ese día
- Instrucciones para el día siguiente

**Análisis FODA del día:**
| Dimensión | Qué registra |
|-----------|-------------|
| ✅ **Aspectos positivos** | Logros del día, avances importantes, buenas prácticas |
| ❌ **Aspectos negativos** | Problemas encontrados, incidentes, materiales defectuosos |
| 💡 **Oportunidades** | Mejoras detectadas, alternativas de proceso |
| ⚠️ **Amenazas** | Riesgos climáticos, retrasos potenciales, conflictos |

**Avance por rubros del día:**
- Por cada actividad realizada: descripción, cantidad ejecutada, unidad, % de avance y observación

**Personal presente en la jornada:**
- Nombre, categoría (Albañil / Oficial / Peón / Electricista / Plomero)
- Horas trabajadas y observaciones particulares

**Documentación fotográfica:**
- Enlace a carpeta de Google Drive o OneDrive con las fotos del día
- Las fotos no se almacenan en el servidor (evita llenar el disco con archivos pesados)

**Firma del responsable:**
- Nombre del fiscal de obra o encargado que valida la entrada

### ¿Qué nos da?

- Documento legal diario con respaldo ante reclamaciones del propietario
- Historial de condiciones climáticas para justificar atrasos de plazo
- Control de asistencia y productividad del personal
- Registro FODA que permite aprender de cada obra para mejorar la siguiente
- Alertas de stock integradas: la bitácora avisa si algún material está por agotarse
- Acceso desde el celular para el fiscal en campo (sin necesidad de volver a la oficina)

---

## 11. Módulo 10 — Reportes y Exportaciones

### ¿Para qué sirve?

Genera documentos formales e imprimibles para distintos destinatarios: el cliente, el equipo de dirección, el fisco, el banco o las autoridades municipales.

### Tipos de reporte disponibles:

**1. Reporte del Cliente (precio "ciego")**
- Presupuesto profesional formateado con logo y datos de la empresa
- Datos del proyecto: código, nombre, ubicación, superficie, fechas
- Tabla de rubros: Código | Descripción | Unidad | Cantidad | Precio Unitario | Subtotal
- **Los costos de materiales y la rentabilidad NO son visibles para el cliente**
- Exportación a CSV

**2. Reporte Profesional (desglose completo APU)**
- Idéntico al anterior MÁS el desglose completo de cada rubro:
  - Por insumo: nombre, unidad, rendimiento, % pérdida, cantidad real, precio unitario, total
- Para uso interno del equipo técnico, auditorías y licitaciones
- Exportación a CSV

**3. Reporte de Cronograma**
- Listado de todos los rubros con:
  - Fechas de inicio y fin planificadas
  - Duración en días
  - Porcentaje de avance real
- Para seguimiento de tiempos con el propietario

**4. Reporte de Mano de Obra**
- Lista de contratos de cuadrillas:
  - Jefe de cuadrilla, estado del contrato
  - Monto pactado, total pagado, retención, saldo pendiente
- Para control interno y negociaciones con subcontratistas

**5. Reporte de Logística**
- Lista de todos los costos indirectos:
  - Tipo, descripción, proveedor, monto, fecha, comprobante
- Para análisis de costos indirectos totales del proyecto

### Funciones de exportación:

| Función | Descripción |
|---------|-------------|
| Vista previa en pantalla | Ver el documento antes de imprimir |
| Imprimir | Envía directamente a la impresora o genera PDF desde el navegador |
| Descargar CSV | Exporta los datos para procesar en Excel |
| Logo de empresa | Se sube una vez y aparece en todos los reportes |

### ¿Qué nos da?

- Documentos con imagen corporativa sin necesidad de Word ni Excel
- Presupuestos que el cliente puede leer e interpretar fácilmente
- Reportes internos con el desglose real de costos para tomar decisiones
- Toda la información consolidada en un solo documento sin copiar datos entre planillas

---

## 12. Sistema de usuarios y permisos

### Roles del sistema:

| Rol | Capacidades |
|-----|-------------|
| **ADMIN** | Acceso total a todos los módulos, gestión de usuarios de la empresa |
| **USUARIO** | Acceso solo a los módulos que el ADMIN le asigna |

### Módulos con permisos granulares:

El ADMIN puede habilitar o deshabilitar el acceso por usuario a cada módulo:

`Proyecto · Presupuesto · Cronograma · Financiero · Mano de Obra · Logística · Compras · Inventario · Bitácora · Reportes`

### Seguridad:

- Autenticación con email y contraseña cifrada (bcrypt)
- Sesiones JWT de 8 horas
- Historial de accesos por usuario (fecha, hora, IP, dispositivo)
- Toda la información está aislada por empresa — una empresa nunca ve datos de otra
- Validación de pertenencia en cada operación: no es posible acceder a datos de otro proyecto aunque se conozca el ID

---

## 13. Flujo de trabajo completo

El siguiente flujo describe el ciclo de vida completo de un proyecto dentro del sistema:

```
ETAPA 1 — INICIO DE PROYECTO
─────────────────────────────
➤ Crear el proyecto con su ficha técnica completa
➤ Cargar propietarios, equipo técnico y láminas de planos
➤ Registrar la aprobación contractual (monto, plazo, firmantes)

ETAPA 2 — PRESUPUESTO Y PLANIFICACIÓN
───────────────────────────────────────
➤ Elaborar el presupuesto APU rubro por rubro
➤ Ajustar % de imprevistos y ganancia
➤ Generar reporte del cliente y obtener aprobación
➤ El cronograma se sincroniza automáticamente con los rubros
➤ Asignar fechas de inicio y duración a cada rubro

ETAPA 3 — EJECUCIÓN DE OBRA
─────────────────────────────
➤ Registrar contratos con cuadrillas (Mano de Obra)
➤ Cargar facturas de proveedores a medida que llegan (Compras)
➤ Registrar recepciones de materiales en bodega (Inventario)
➤ El fiscal de obra llena la Bitácora diaria desde el campo

ETAPA 4 — CONTROL FINANCIERO
──────────────────────────────
➤ Registrar cobros al propietario (ingresos)
➤ Registrar pagos a proveedores y cuadrillas (egresos)
➤ Monitorear el saldo disponible y el saldo por cobrar
➤ Pagar cuadrillas según avance de obra, reteniendo la garantía

ETAPA 5 — SEGUIMIENTO Y AJUSTES
─────────────────────────────────
➤ Registrar avances reales en el cronograma
➤ Comparar Curva S planificada vs. real
➤ Actualizar inventario conforme se instalan materiales
➤ Registrar logística y costos indirectos reales

ETAPA 6 — CIERRE DE OBRA
──────────────────────────
➤ Verificar facturas pagas / pendientes (Compras)
➤ Liberar retenciones de garantía (Mano de Obra)
➤ Generar reporte final para el propietario
➤ Cambiar el estado del proyecto a "Finalizado"
➤ El sistema mantiene el historial completo del proyecto por tiempo indefinido
```

---

## 14. Ventajas y beneficios del sistema

### Para la empresa constructora

| Beneficio | Impacto |
|-----------|---------|
| **Todos los módulos en un solo sistema** | No hay que abrir 6 planillas Excel distintas para ver el estado de una obra |
| **Presupuestos APU automáticos** | Lo que tomaba 2 días ahora toma 2 horas |
| **Control financiero en tiempo real** | Se sabe el saldo de caja disponible en todo momento |
| **Cero pérdida de datos** | Los datos se guardan en la base de datos, no en archivos locales que se pueden borrar |
| **Acceso multi-usuario** | Todo el equipo trabaja sobre la misma información actualizada |
| **Historial completo** | Todos los movimientos, pagos y decisiones quedan registrados con fecha y autor |
| **Reportes con imagen corporativa** | Logo, slogan, datos de la empresa en todos los documentos |

### Para el director de obra

- Ve el estado real de cada proyecto desde un panel central
- Detecta atrasos en el cronograma antes de que sean irrecuperables
- Monitorea la rentabilidad de la obra en tiempo real
- Tiene toda la documentación legal (bitácoras, aprobaciones) organizada y buscable

### Para el equipo financiero

- Ve cuánto se cobró, cuánto se gastó y cuánto queda
- Controla qué facturas están pagas y cuáles pendientes
- Sigue los pagos a cuadrillas con retenciones calculadas automáticamente
- Tiene el libro mayor de cada proyecto en cualquier momento

### Para el fiscal de obra

- Llena la bitácora desde el celular sin ir a la oficina
- Registra FODA diario que documenta problemas para respaldo legal
- Ve las alertas de materiales por agotarse antes de que paren la obra
- Toma fotos y las vincula directamente a la entrada del día

### Para el propietario / cliente

- Recibe un presupuesto formal con imagen profesional
- Puede pedir un reporte de avance en cualquier momento
- Tiene respaldo documentado de todo lo que se invirtió en su obra

### Diferenciadores clave

1. **Precio APU desde costos reales** — No es un presupuesto basado en precios de mercado genéricos; está basado en los costos reales de los materiales y la mano de obra que usa esa empresa.

2. **Sistema integrado end-to-end** — El presupuesto alimenta el cronograma. Las facturas de compras se vinculan al estado financiero. La bitácora consulta el inventario. No hay datos duplicados.

3. **Bitácora con FODA** — No es solo un "diario de obra" básico. El análisis FODA por jornada convierte la bitácora en una herramienta de aprendizaje organizacional.

4. **As-Built por ambiente** — La trazabilidad de qué material (qué lote, qué marca) se instaló en qué espacio es un diferencial para obras de calidad, garantías extendidas y certificaciones.

5. **Precio "ciego" al cliente** — El reporte del cliente muestra precios sin revelar los costos internos ni el margen de ganancia.

6. **Acceso de campo sin instalación** — El fiscal escanea un QR y ya está trabajando en la bitácora desde su celular. No instala nada.

---

## 15. Stack tecnológico

| Capa | Tecnología |
|------|-----------|
| Framework web | Next.js 16.2.2 (App Router) |
| Lenguaje | TypeScript 5 |
| UI | React 19 + Tailwind CSS 4 |
| Gráficos | Recharts |
| Iconos | Lucide React |
| Notificaciones | Sonner |
| ORM | Prisma 7.6 |
| Base de datos | PostgreSQL |
| Autenticación | NextAuth v5 (JWT · 8 horas) |
| Seguridad | bcrypt · CSRF · CSP headers · HSTS |
| Empaquetado futuro | Electron + electron-builder (.exe / .dmg) |

---

## Estado del proyecto

| Módulo | Estado |
|--------|--------|
| Autenticación y usuarios | ✅ Completo |
| Ficha técnica de proyectos | ✅ Completo |
| Presupuesto APU | ✅ Completo |
| Cronograma / Curva S | ✅ Completo |
| Estado financiero | ✅ Completo |
| Mano de obra | ✅ Completo |
| Logística e indirectos | ✅ Completo |
| Proveedores y compras | ✅ Completo |
| Inventario / As-Built | ✅ Completo |
| Bitácora de obra | ✅ Completo |
| Reportes y exportaciones | ✅ Completo |
| Instalador Electron (.exe) | 🔜 En hoja de ruta |
| Acceso remoto de campo (QR) | 🔜 En hoja de ruta |
| Sistema de licencias | 🔜 En hoja de ruta |

---

*Documento interno — TekoInnova · Abril 2026*

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
