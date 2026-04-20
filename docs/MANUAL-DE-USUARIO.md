# TEKÓGA — Manual de Usuario

> **Centro de Mando para Empresas Constructoras**  
> Versión 2.0 · Abril 2026  
> Desarrollado por **TekoInnova** — Asunción, Paraguay

---

## Tabla de contenidos

1. [¿Qué es TEKÓGA?](#1-qué-es-tekóga)
2. [Tipos de usuarios](#2-tipos-de-usuarios)
3. [Cómo iniciar sesión](#3-cómo-iniciar-sesión)
4. [El Centro de Mando](#4-el-centro-de-mando)
5. [Módulo 1 — Proyectos y Ficha Técnica](#5-módulo-1--proyectos-y-ficha-técnica)
6. [Módulo 2 — Cómputo y Presupuesto](#6-módulo-2--cómputo-y-presupuesto)
7. [Módulo 3 — Cronograma](#7-módulo-3--cronograma)
8. [Módulo 4 — Estado Financiero](#8-módulo-4--estado-financiero)
9. [Módulo 5 — Mano de Obra](#9-módulo-5--mano-de-obra)
10. [Módulo 6 — Logística](#10-módulo-6--logística)
11. [Módulo 7 — Compras](#11-módulo-7--compras)
12. [Módulo 8 — Inventario y As-Built](#12-módulo-8--inventario-y-as-built)
13. [Módulo 9 — Bitácora de Obra](#13-módulo-9--bitácora-de-obra)
14. [Módulo 10 — Reportes](#14-módulo-10--reportes)
15. [Módulo 11 — Estadísticas y Dashboard](#15-módulo-11--estadísticas-y-dashboard)
16. [Exportación de datos](#16-exportación-de-datos)
17. [Administración de usuarios](#17-administración-de-usuarios)
18. [Acceso de campo (fiscales y capataces)](#18-acceso-de-campo-fiscales-y-capataces)
19. [Acceso desde otras computadoras de la oficina](#19-acceso-desde-otras-computadoras-de-la-oficina)
20. [Preguntas frecuentes](#20-preguntas-frecuentes)

---

## 1. ¿Qué es TEKÓGA?

**TEKÓGA** es el sistema de gestión integral para obras de construcción desarrollado por TekoInnova. Permite a las empresas constructoras gestionar en un solo lugar toda la información de sus proyectos: presupuestos con cómputo métrico, control de avances de obra, cronogramas, finanzas, personal, materiales, inventario, bitácora de obra, estadísticas y reportes.

### El flujo de datos en TEKÓGA

TEKÓGA está diseñado como un sistema conectado: los datos que cargás en un módulo alimentan automáticamente a los demás. El ejemplo más claro:

```
Cómputo y Presupuesto
  └── Rubros con recetas de insumos
        └── Avances de Obra (% ejecutado)
              └── Inventario / Insumos Consolidados
                    └── Consumo teórico calculado automáticamente
                          └── Comparación con lo recibido en bodega
                                └── Stock disponible en tiempo real
```

Esto significa que cuando registrás un avance en el módulo de Presupuesto, el sistema calcula automáticamente cuántos materiales debería haberse consumido en obra, y eso se refleja en el módulo de Inventario sin necesidad de cargarlo manualmente.

### ¿Cómo funciona tecnológicamente?

La aplicación se instala en **un solo ordenador** de la empresa (el *servidor local*). Desde ese ordenador, los demás equipos de la empresa pueden acceder usando su navegador web, sin instalar nada. Los trabajadores en campo (fiscales, capataces) acceden desde su celular escaneando un código QR.

```
┌──────────────────────────────────────────────────┐
│  ORDENADOR PRINCIPAL (servidor local)            │
│  - Instala TEKÓGA aquí                           │
│  - Todos los datos se guardan en este disco      │
└──────────────────┬───────────────────────────────┘
                   │  Red WiFi de la oficina
         ┌─────────┼─────────────┐
         ▼         ▼             ▼
   [Director]  [Arquitecta]  [Contador]
   Navegador   Navegador     Navegador
   web         web           web
                   │
                   │  Internet (celular del fiscal)
         ┌─────────┴──────────────┐
         ▼                        ▼
   [Fiscal en obra]        [Capataz en obra]
   Escanea QR del          Escanea QR del
   proyecto                proyecto
   → Bitácora móvil        → Bitácora móvil
```

---

## 2. Tipos de usuarios

El sistema tiene **cuatro tipos de acceso**:

### ADMINISTRADOR
Usuario principal de la empresa. Puede hacer absolutamente todo:
- Crear, editar y eliminar proyectos
- Agregar y gestionar todos los usuarios del sistema
- Acceder a todos los módulos sin restricción
- Configurar el acceso de campo (fiscales)
- Ver todos los informes y exportar datos

> **Nota:** Debe existir al menos un usuario con rol Administrador. Se recomienda tener máximo dos administradores para mayor seguridad.

### USUARIO (funcionario de oficina)
Empleado o colaborador de la empresa con acceso limitado a los módulos que el Administrador le asigne. Por ejemplo: solo ver Presupuesto y Financiero, pero no modificar datos de proyectos.

### FISCAL / CAPATAZ (acceso de campo)
Persona que trabaja en la obra. **No necesita email ni contraseña**. Accede escaneando el código QR de su proyecto + ingresando su PIN de 4 a 6 dígitos. Solo puede ver y completar la Bitácora de esa obra específica.

### VISITANTE / PROPIETARIO *(próximamente)*
Acceso de solo lectura para el propietario del proyecto o clientes que quieran consultar el estado de la obra.

---

## 3. Cómo iniciar sesión

### Para usuarios de oficina (Administrador y Usuarios)

1. Abra su navegador web (Chrome, Firefox, Edge o Safari)
2. Escriba la dirección del sistema en la barra de navegación:
   - Si está en el ordenador principal: `http://localhost:3000`
   - Si está en otro equipo de la red: `http://192.168.X.X:3000` (la IP que le indique el Administrador)
3. Verá la pantalla de inicio de sesión de TEKÓGA
4. Ingrese su **correo electrónico** y **contraseña**
5. Haga clic en **"Ingresar"**

> **Si olvidó su contraseña:** Comuníquese con el Administrador del sistema para que le restablezca el acceso.

### Para fiscales y capataces en campo

No necesita ningún correo ni contraseña. Siga las instrucciones de la sección [Acceso de campo](#18-acceso-de-campo-fiscales-y-capataces).

---

## 4. El Centro de Mando

Al ingresar con su cuenta, llegará al **Centro de Mando**: la pantalla principal desde donde accede a todos los proyectos y módulos.

### ¿Qué verá en el Centro de Mando?

- **Listado de proyectos**: Todos los proyectos de la empresa con su estado y datos clave
- **Acceso rápido**: Botones para ir directo a cada módulo de un proyecto
- **Indicadores generales**: Resumen de proyectos activos, en pausa y finalizados
- **Menú de navegación**: Parte superior con acceso a configuración y perfil

### Barra de navegación superior

| Elemento | Qué hace |
|----------|----------|
| Logo TEKÓGA | Vuelve al Centro de Mando desde cualquier pantalla |
| Nombre de usuario | Muestra opciones de perfil y cerrar sesión |
| Ícono de ajustes ⚙️ | Acceso a la configuración (solo ADMIN) |

---

## 5. Módulo 1 — Proyectos y Ficha Técnica

La **Ficha del Proyecto** es el núcleo del sistema. Todos los demás módulos (presupuesto, cronograma, financiero, etc.) pertenecen a un proyecto específico.

### Cómo crear un nuevo proyecto

1. En el Centro de Mando, haga clic en el botón **"+ Nuevo Proyecto"**
2. Complete los datos del formulario:
   - **Código del proyecto** (Ej: `PRY-2026-001`) — debe ser único en el sistema
   - **Nombre del proyecto** (Ej: `Residencia García — San Lorenzo`)
   - **Descripción breve** (opcional)
   - **Ubicación** — dirección o referencia de la obra
   - **Superficie a construir** (m²)
   - **Superficie del terreno** (m²)
   - **Fecha de inicio estimada**
   - **Fecha de fin estimada**
   - **Estado** — seleccione el estado actual del proyecto
3. Haga clic en **"Guardar"**

### Estados de un proyecto

| Estado | Descripción |
|--------|-------------|
| Anteproyecto | Etapa conceptual, sin contrato firmado |
| Borrador | En elaboración, no enviado al cliente |
| Proyecto Ejecutivo | Planos y presupuesto finalizados |
| Contrato Confirmado | Contrato firmado, obra pendiente de iniciar |
| Presupuestado | Presupuesto aprobado, inicio próximo |
| En Ejecución | Obra en curso |
| Pausado | Obra temporalmente detenida |
| Finalizado | Obra entregada |
| Cancelado | Proyecto cancelado definitivamente |

### Secciones dentro de la Ficha del Proyecto

#### Propietarios
Datos del cliente o propietario de la obra. Puede agregar más de uno (copropiedad).
- Nombre completo, documento de identidad, teléfono, correo de contacto, dirección.

#### Equipo Técnico
Los profesionales responsables del proyecto:
- Arquitecto/a responsable, Director de obra, Calculista estructural, Ingeniero eléctrico, sanitario, etc.
- Cargo y datos de contacto de cada uno.

#### Planos y Láminas
Registro de planos del proyecto:
- Código de lámina (Ej: `ARQ-01`), descripción, escala, fecha de aprobación y enlace al archivo.

> **Importante:** Los archivos de planos NO se guardan dentro del sistema. Suba los planos a Google Drive o similar y pegue el enlace aquí.

#### Acceso de Campo
Gestión de accesos para fiscales y capataces. Ver sección [Acceso de campo](#18-acceso-de-campo-fiscales-y-capataces).

---

## 6. Módulo 2 — Cómputo y Presupuesto

El módulo de Cómputo y Presupuesto centraliza toda la dimensión técnica de la obra: el cálculo de cantidades, los costos por rubro y —muy importante— el **seguimiento del avance físico ejecutado**, que alimenta automáticamente al módulo de Inventario.

### Conceptos fundamentales

| Concepto | Descripción |
|----------|-------------|
| **Rubro** | Un trabajo o partida de obra. Ej: "Losa de H°A° e=0.20m", "Mampostería de ladrillo" |
| **Receta** | Lista de materiales e insumos necesarios para ejecutar 1 unidad del rubro |
| **Cómputo métrico** | Las cantidades de cada rubro según medición de planos |
| **Avance de obra** | Cuántas unidades de cada rubro se han ejecutado físicamente hasta hoy |
| **Consumo teórico** | Lo que *debería* haberse consumido de cada material según el avance declarado |

### Pestañas del módulo

---

### Pestaña 1 — Rubros y Recetas

Aquí se construye el presupuesto del proyecto.

#### Flujo de trabajo

1. **Agregar rubros**: Haga clic en **"+ Agregar rubro"** y seleccione del catálogo maestro, o cree uno personalizado
2. **Ingresar cantidades (cómputo)**: Para cada rubro, ingrese la cantidad de unidades según los planos
3. **Verificar receta de insumos**: Cada rubro trae su receta del catálogo maestro. Puede ajustar cantidades y porcentaje de pérdida por proyecto
4. **Revisar precios**: El sistema usa los precios del catálogo maestro; puede ajustarlos para este proyecto específico
5. **Ver totales**: El sistema calcula automáticamente subtotal por rubro y total general

#### Receta de insumos

Dentro de cada rubro puede ver y editar la **receta de insumos**: la lista de materiales necesarios para ejecutar 1 unidad de ese rubro, con:
- Nombre del insumo y unidad de medida
- Cantidad por unidad de rubro (rendimiento)
- Porcentaje de pérdida (merma estimada)

> **Ejemplo:** Para el rubro "Losa de H°A° e=0.20m" por cada m² de losa, la receta indica: 0.22 m³ de hormigón elaborado, 12 kg de hierro Ø12, 1.5 kg de alambre, etc.

---

### Pestaña 2 — Avances de Obra *(sistema central de control)*

Esta pestaña es el **libro de avance físico** de la obra. Aquí se registra, por cada rubro, cuántas unidades se han ejecutado hasta la fecha. Es el motor que alimenta el control de materiales en Inventario.

#### ¿Cómo funciona?

Cada rubro del presupuesto tiene su propio historial de avances. Se registra de forma **incremental**: cada vez que hay progreso en un rubro, se carga la cantidad adicional ejecutada con su fecha. El sistema acumula todas las cargas para mostrar el total ejecutado.

#### Cómo registrar un avance

1. En la tabla de avances, localice el rubro
2. Haga clic en **"Cargar avance"**
3. En el formulario:
   - **Fecha**: Fecha del avance (puede ser pasada)
   - **Cantidad ejecutada**: Cuántas unidades adicionales se ejecutaron en esta carga
   - **Nota** *(opcional)*: Observación o descripción del avance
4. Haga clic en **"Registrar avance"**

#### Lo que muestra la tabla de avances

| Columna | Descripción |
|---------|-------------|
| Rubro | Nombre y código del rubro |
| Presupuestado | Cantidad total del cómputo (según planos) |
| Ejecutado | Suma acumulada de todos los avances registrados |
| Avance % | Porcentaje ejecutado vs. presupuestado |
| Barra de progreso | Visualización gráfica del avance |

#### Historial de cargas por rubro

Al hacer clic en "Cargar avance", también se muestra el historial completo de todas las cargas anteriores de ese rubro: fecha, cantidad, nota y quién lo registró. Esto permite rastrear cómo fue avanzando el trabajo en el tiempo.

#### ¿Por qué es tan importante esta pestaña?

Los avances registrados aquí se usan en Inventario para calcular automáticamente:
- Cuántos materiales **debería** haberse consumido (consumo teórico)
- Cuánto **debería quedar** en bodega (stock teórico)
- Si hay una varianza entre lo teórico y el conteo físico real (control de pérdidas)

---

### Pestaña 3 — Análisis de Costos

Vista consolidada de costos por categoría (materiales, mano de obra, equipos, costos indirectos) con comparación presupuestado vs. ejecutado.

---

### Pestaña 4 — Exportar / Imprimir

Opciones de exportación del presupuesto completo:
- **CSV**: Para abrir en Excel o importar a otros sistemas
- **PDF / Imprimir**: Genera el presupuesto con encabezado de la empresa, listo para presentar al cliente

---

## 7. Módulo 3 — Cronograma

El cronograma permite planificar las tareas de la obra en el tiempo y hacer seguimiento del avance.

### Cómo usar el cronograma

1. Ingrese al proyecto → **Cronograma**
2. Para agregar una tarea, haga clic en **"+ Agregar tarea"**
3. Complete:
   - **Nombre de la tarea** (Ej: `Excavación y movimiento de suelo`)
   - **Fecha de inicio**
   - **Duración** en días o semanas
   - **Dependencias**: si esta tarea debe comenzar después de otra
4. Actualice el avance real (%) conforme avanza la obra

### Vista Gantt

El cronograma se visualiza como un diagrama de barras (Gantt) donde puede ver de un vistazo:
- Qué tareas están en curso
- Cuáles están retrasadas (aparecen en rojo)
- El avance global del proyecto

---

## 8. Módulo 4 — Estado Financiero

Registra y controla todos los movimientos de dinero: ingresos del cliente, pagos a proveedores, gastos de obra y flujo de caja.

### Tipos de movimientos

| Tipo | Descripción | Ejemplo |
|------|-------------|---------|
| Ingreso | Dinero que entra | Anticipo del cliente, certificado de avance |
| Egreso | Dinero que sale | Pago a proveedor, jornal de peones |
| Factura | Egreso con comprobante formal | Factura de ferretería |

### Cómo registrar un movimiento

1. Ingrese al proyecto → **Estado Financiero**
2. Haga clic en **"+ Nuevo movimiento"**
3. Complete: Tipo, Fecha, Descripción, Monto, Categoría, Número de comprobante
4. **Guardar**

### Saldo disponible

El sistema muestra en tiempo real:
```
Saldo = Total de ingresos − Total de egresos
```
Si el saldo es negativo aparece marcado en rojo como advertencia.

### Certificados de avance

Registre los certificados de avance de obra que se presentan al cliente para cobrar:
- Número de certificado, período que cubre, monto, estado (Pendiente / Pagado).

### Exportación

- **CSV**: Todos los movimientos en hoja de cálculo
- **PDF / Imprimir**: Estado financiero con encabezado de empresa, para presentar al directorio o al cliente

---

## 9. Módulo 5 — Mano de Obra

Registra contratos de cuadrillas y el control de pagos de la nómina de obra.

### Contratos de cuadrilla

Para cada cuadrilla o contratista:
1. Ingrese al proyecto → **Mano de Obra**
2. Haga clic en **"+ Nuevo contrato"**
3. Complete:
   - **Nombre del jefe de cuadrilla / contratista**
   - **Descripción del trabajo a realizar**
   - **Monto pactado total**
   - **Fecha de inicio y fin estimado**
   - **Retención** (% de garantía, si aplica)
4. **Guardar**

### Registro de pagos

Para cada contrato registre los pagos parciales:
- Fecha del pago
- Monto
- Método de pago (Efectivo, Cheque, Transferencia, etc.)
- Número de comprobante

El sistema muestra:
- Monto pactado vs. total pagado
- Retención acumulada
- Porcentaje de avance del pago
- Estado del contrato (En curso / Completado / Pendiente)

### Exportación

Por cada contratista puede exportar:
- **CSV**: Historial completo de pagos
- **PDF**: Comprobante de pago con encabezado de empresa
- **Imprimir**: Impresión directa del comprobante

---

## 10. Módulo 6 — Logística

Gestión de equipos y maquinarias asignados al proyecto, y de los gastos logísticos (transporte, alquileres, viáticos).

### Tab Equipos y Maquinaria

Registre cada equipo o máquina asignado a la obra:
- Descripción del equipo
- Rubro de obra al que está asignado
- Unidad (Días, Horas, Viajes, etc.)
- Cantidad y costo unitario

El sistema calcula el subtotal de equipos y el total del módulo.

### Tab Gastos Logísticos

Para cada gasto de transporte, viático o alquiler:
- Descripción, fecha, monto, categoría de gasto
- Método de pago
- Número de comprobante

### Exportación

- **CSV**: Todos los equipos y gastos en una hoja de cálculo
- **PDF / Imprimir**: Resumen de logística con encabezado de empresa

---

## 11. Módulo 7 — Compras

Gestión centralizada de proveedores y facturas de compra para el proyecto.

### Catálogo de proveedores

El catálogo de proveedores es **global** (compartido entre todos los proyectos). Para agregar un proveedor:
1. Vaya al menú → **Proveedores** (o desde el módulo de Compras)
2. Haga clic en **"+ Nuevo proveedor"**
3. Complete: Nombre de empresa, RUC, rubros que suministra, contacto y dirección
4. **Guardar**

### Registro de facturas

Para cada compra registre la factura:
1. Ingrese al proyecto → **Compras**
2. Haga clic en **"+ Nueva factura"**
3. Complete:
   - **Proveedor** (seleccione del catálogo)
   - **Número de factura**
   - **Fecha de emisión**
   - **Descripción** de lo comprado
   - **Monto total**
   - **Estado**: Pendiente de pago / Pagada / Vencida
4. **Guardar**

### Registro de pagos de facturas

Puede registrar pagos parciales o totales de cada factura, con fecha, monto y método de pago.

### Exportación

- **CSV**: Listado completo de facturas y pagos
- **PDF / Imprimir**: Resumen de compras con encabezado de empresa

---

## 12. Módulo 8 — Inventario y As-Built

Este módulo gestiona dos funciones complementarias: el control de materiales en bodega y el registro técnico As-Built (qué material fue instalado dónde). Tiene **cinco pestañas**.

---

### Pestaña 1 — Ambientes

Define los ambientes o sectores de la obra donde se instalarán los materiales (usados en el registro As-Built).

**Ejemplos de ambientes:**
- Planta baja — Cocina
- Dormitorio 1
- Baño principal
- Fachada norte
- Cubierta

Para agregar un ambiente: escriba el nombre y haga clic en **"Agregar"**.

---

### Pestaña 2 — Recepción y Bodega *(historial de ingresos)*

Esta pestaña es el **libro de ingresos de materiales**: registra cada remisión o carga que llega a la obra, con todos sus datos de trazabilidad.

> **Nota importante:** Esta pestaña muestra el *historial* de cada remisión individual. Si el cemento llegó en 20 cargas distintas, aparecerán 20 renglones —uno por cada remisión. El stock consolidado se ve en la pestaña **Insumos Consolidados**.

#### Cómo registrar una recepción

Cada vez que llega un camión con materiales:
1. Haga clic en **"+ Registrar Remisión"**
2. Complete:
   - **Material** (seleccione del catálogo)
   - **Cantidad recibida** y unidad
   - **Fecha de recepción**
   - **Proveedor** (opcional)
   - **N° de remisión** (Ej: `REM-2026-0142`)
   - **Responsable de recepción** (capataz o encargado de bodega)
   - **Marca / SKU / N° de lote** *(para materiales con trazabilidad: cerámicos, porcelanatos, pinturas)*
   - **Especificación técnica** *(para materiales a granel: granulometría, tipo de cemento, etc.)*
3. **Registrar**

#### Lo que muestra la tabla de historial

| Columna | Descripción |
|---------|-------------|
| Material | Nombre, código, marca y especificación |
| Proveedor | Razón social del proveedor |
| Remisión / Lote | N° de remisión y lote |
| Recibido | Cantidad recibida en esa entrega |
| Fecha | Fecha de recepción |

Cada renglón tiene un botón para ver el detalle completo de esa recepción e imprimirlo.

#### Exportación del historial

- **CSV**: Todos los ingresos de bodega en hoja de cálculo (útil para conciliar con facturas)
- **Imprimir**: Historial completo con encabezado de empresa

---

### Pestaña 3 — Insumos Consolidados *(libro mayor de materiales)*

Esta pestaña es el **libro mayor de materiales**: muestra un único renglón por cada tipo de material, consolidando toda la información de avance y bodega en tres columnas clave.

> Esta es la vista operativa principal para el control diario de materiales.

#### Las tres columnas

| Columna | Qué muestra | Fuente de datos |
|---------|-------------|-----------------|
| **Total Recibido** | Suma de todas las remisiones de ese material que ingresaron a bodega | Pestaña Recepción y Bodega |
| **Consumo (Avance Obra)** | Cuánto debería haberse usado según los avances registrados × la receta del rubro | Módulo Cómputo → Pestaña Avances de Obra |
| **Stock Disponible** | Total Recibido − Consumo | Calculado automáticamente |

#### Fórmula del consumo teórico

```
Consumo teórico de un material =
  Σ ( Avance ejecutado del rubro × Rendimiento del insumo × (1 + % de pérdida / 100) )
```

Si un material se usa en múltiples rubros, el sistema suma el consumo de todos ellos.

#### Señales de alerta

- **Renglón en rojo / badge "déficit"**: El stock teórico es negativo. Significa que según los avances declarados se usó más material del que entró a bodega. Esto puede indicar:
  - Remisiones no registradas en bodega
  - Avances sobrecargados (se declaró más avance del real)
  - Pérdidas, robos o mermas no contabilizadas
- **Stock en verde**: El material disponible es positivo y dentro de lo esperado

#### Actualización automática

Los datos se actualizan automáticamente cada vez que:
- Se registra una nueva remisión en Recepción y Bodega
- Se carga un avance de obra en el módulo de Cómputo

Use el botón **Actualizar** para forzar una recarga manual.

#### Exportación

- **CSV**: Tabla completa para análisis en Excel
- **Imprimir / PDF**: Reporte con encabezado de empresa

---

### Pestaña 4 — Matriz As-Built

Registra dónde se instaló cada material, por ambiente. Al finalizar la obra, esto genera el **dossier técnico As-Built** que se entrega al propietario.

#### Cómo registrar una instalación

1. Seleccione el **ambiente** en el panel izquierdo (Ej: "Dormitorio 1")
2. Haga clic en **"+ Registrar instalación"**
3. Complete:
   - **Material** (seleccione del stock disponible en bodega)
   - **Cantidad instalada**
   - **Fecha de instalación**
   - **Dosificación / Mezcla** *(si aplica: Ej: "3 arena + 1 cemento")*
   - **Mecanismo de instalación** *(Ej: "Doble encolado", "Vaciado directo")*
4. **Guardar**

> El As-Built conserva el historial completo de qué material (con su marca, lote y proveedor exacto) fue instalado en cada parte de la obra.

---

### Pestaña 5 — Exportar Dossier

Genera el dossier técnico As-Built completo para entrega al cliente.

Opciones de exportación:
- **CSV**: Todos los registros As-Built en hoja de cálculo
- **TXT Raw Data**: Formato texto plano, útil para integración con otros sistemas
- **Imprimir Dossier Completo**: PDF con encabezado de empresa, organizado por ambiente

> **El As-Built es un documento permanente**: Registra el estado final de la obra para efectos de garantía, mantenimiento y reforma futura. No se modifica una vez entregado.

---

### Pestaña interna — Control de Stock *(uso interno)*

Esta pestaña es una herramienta **interna de la constructora** y **no se incluye en los documentos que se entregan al cliente**.

Cruza tres fuentes de datos para detectar varianzas:
1. **Stock teórico** (calculado desde avances × receta)
2. **Conteo físico** de bodega (ingresado manualmente por el encargado)
3. **Varianza** = Conteo físico − Stock teórico

Una varianza negativa grande indica posibles pérdidas, robos o mermas no documentadas.

#### Cómo registrar un conteo físico

1. Localice el material en la tabla
2. Haga clic en **"Registrar Conteo"**
3. Ingrese la cantidad contada físicamente en bodega y la fecha del conteo
4. **Guardar**

El sistema muestra inmediatamente la varianza y marca en rojo los materiales con déficit.

---

## 13. Módulo 9 — Bitácora de Obra

La Bitácora es el **diario oficial de la obra**. Registra día a día las condiciones de trabajo, el personal presente, los avances, los problemas y las alertas. Tiene tres pestañas.

---

### Pestaña 1 — Historial

Vista cronológica de todas las entradas anteriores. Cada tarjeta muestra el resumen de la jornada y puede expandirse para ver el detalle completo.

#### Exportación del historial

- **CSV**: Todas las entradas en hoja de cálculo (para análisis de productividad, días perdidos por lluvia, etc.)
- **PDF**: Bitácora completa con encabezado de empresa, una sección por cada entrada
- **Imprimir**: Impresión directa desde navegador

---

### Pestaña 2 — Nueva Entrada

Formulario para registrar la jornada del día.

#### Campos disponibles

**Condiciones generales:**
- **Turno**: Completo / Mañana / Tarde / Nocturno
- **Hora de inicio y fin**
- **Clima**: Soleado / Parcialmente nublado / Nublado / Lluvioso / Tormenta / Ventoso / Frío
- **Temperatura** (°C)
- **Descripción general** de la jornada

**Personal del día:**
Para cada persona presente en obra:
- Nombre completo
- Categoría (Capataz, Albañil, Oficial, Peón, Electricista, etc.)
- Horas trabajadas

**Rubros del día:**
Los trabajos ejecutados en la jornada:
- Descripción del trabajo
- Cantidad ejecutada y unidad
- Avance estimado (%)
- Observación

**Análisis FODA:**
- **Fortalezas** (F): Qué salió bien
- **Oportunidades** (O): Qué se puede mejorar o aprovechar
- **Debilidades** (D): Qué tuvo problemas
- **Amenazas** (A): Riesgos identificados para días siguientes

**Otros campos:**
- **Observaciones generales**
- **Responsable** (firma / nombre del supervisor)
- **Enlace de fotos**: URL a carpeta de Google Drive, OneDrive, etc.

> **¿Por qué no guardar fotos en el sistema?** Las fotos de obra pueden ocupar gigabytes. Guardarlas en Google Drive o similar es gratis, ilimitado y permite compartirlas con el cliente fácilmente.

---

### Pestaña 3 — Alertas de Stock

Muestra los materiales en bodega que están cerca de agotarse, calculado en base al ritmo de consumo de los últimos días. Útil para anticipar órdenes de compra antes de que se interrumpa la obra.

| Nivel de alerta | Significado |
|----------------|-------------|
| Crítico | Material se agota en menos de 3 días |
| Bajo | Material se agota en menos de 7 días |
| OK | Stock suficiente |

---

## 14. Módulo 10 — Reportes

Consolida la información de todos los módulos en documentos listos para exportar o imprimir.

### Tipos de reportes disponibles

| Reporte | Contenido |
|---------|-----------|
| Resumen del proyecto | Ficha técnica + cronograma + avance financiero |
| Estado financiero | Ingresos, egresos, saldo, certificados |
| Presupuesto ejecutado vs. estimado | Comparación de costos reales vs. presupuestados |
| Mano de obra | Nómina, pagos y costos de cuadrillas |
| Inventario / As-Built | Stock y destino de materiales |
| Bitácora | Diario completo de obra en el período seleccionado |

### Cómo generar un reporte

1. Ingrese al proyecto → **Reportes**
2. Seleccione el tipo de reporte
3. Defina el período (si aplica): fecha desde / hasta
4. Haga clic en **"Generar"**
5. Opciones de salida: **Ver en pantalla** / **Exportar CSV** / **PDF / Imprimir**

---

## 15. Módulo 11 — Estadísticas y Dashboard

El dashboard de estadísticas consolida todos los datos del proyecto en gráficos interactivos para la toma de decisiones gerenciales.

### Pestañas de gráficos disponibles

| Pestaña | Qué muestra |
|---------|-------------|
| **Insumos x Rubro** | Qué materiales consume cada rubro y en qué proporción |
| **Consolidado** | Insumos totales: proyectado vs. utilizado vs. en bodega |
| **Timeline** | Evolución del uso de materiales en el tiempo |
| **Curva S** | Avance físico real vs. planificado (curva de valor ganado) |
| **Flujo de Caja** | Ingresos y egresos mensuales, saldo acumulado |
| **Mano de Obra** | Estado de contratos, pagado vs. pendiente por cuadrilla |
| **Plan de Cobros** | Cronograma de certificados y cobros al cliente |
| **Costos Indirectos** | Logística, equipos, honorarios profesionales |
| **Bitácora** | Análisis de productividad, días por clima, personal promedio |
| **Salud del Proyecto** | Indicador global de salud: avance, finanzas, stock, personal |
| **Pareto ABC** | Clasificación de materiales por impacto económico |
| **Proyección de Cierre** | Estimación del costo final y fecha de entrega basada en el ritmo actual |
| **Heatmap Actividad** | Mapa de calor de la actividad registrada en bitácora por día |

### Exportación del dashboard

- **CSV**: Exporta la tabla de insumos consolidados + flujo de caja + mano de obra en un solo archivo
- **PDF**: Genera un reporte ejecutivo con KPIs, tablas de insumos, flujo de caja y mano de obra, con encabezado de empresa

---

## 16. Exportación de datos

Todos los módulos de TEKÓGA permiten exportar los datos en distintos formatos:

| Módulo | CSV | PDF / Imprimir |
|--------|:---:|:--------------:|
| Cómputo y Presupuesto | Sí | Sí |
| Estado Financiero | Sí | Sí |
| Mano de Obra | Sí | Sí |
| Logística | Sí | Sí |
| Compras | Sí | Sí |
| Inventario — Recepción y Bodega | Sí | Sí |
| Inventario — Insumos Consolidados | Sí | Sí |
| Inventario — Dossier As-Built | Sí | Sí |
| Bitácora | Sí | Sí |
| Reportes | Sí | Sí |
| Estadísticas | Sí | Sí |

### ¿Qué hace el botón "PDF / Imprimir"?

Abre una ventana de impresión del navegador con el documento ya formateado, con el **encabezado de la empresa** (nombre, logo, datos). Desde esa ventana puede:
- **Imprimir físicamente** en la impresora conectada
- **Guardar como PDF** seleccionando "Guardar como PDF" en el destino de impresión (opción nativa de Chrome, Firefox y Edge)

### ¿Cómo guardar el PDF en el ordenador?

1. Haga clic en **"PDF"** o **"Imprimir"** en el módulo correspondiente
2. Se abre la ventana de impresión del navegador
3. En **"Destino"** o **"Impresora"**, seleccione **"Guardar como PDF"**
4. Elija la carpeta donde guardar y haga clic en **"Guardar"**

---

## 17. Administración de usuarios

Esta sección es solo para el **Administrador** del sistema.

### Cómo agregar un nuevo usuario

1. Vaya al menú → **Configuración** → **Usuarios**
2. Haga clic en **"+ Nuevo usuario"**
3. Complete: Nombre, correo electrónico, contraseña inicial, Rol (Administrador / Usuario)
4. **Asignar permisos por módulo**: Marque los módulos a los que tendrá acceso
5. **Guardar**

### Permisos por módulo

Para cada usuario de tipo **Usuario** (no Admin), puede activar o desactivar el acceso a cada módulo individualmente:

| Módulo | Activable / Desactivable |
|--------|:---:|
| Proyectos | Sí |
| Cómputo y Presupuesto | Sí |
| Cronograma | Sí |
| Estado Financiero | Sí |
| Mano de Obra | Sí |
| Logística | Sí |
| Compras | Sí |
| Inventario y As-Built | Sí |
| Bitácora de Obra | Sí |
| Reportes | Sí |
| Estadísticas | Sí |

Si un usuario intenta acceder a un módulo sin permiso, el sistema muestra un mensaje de acceso denegado.

### Cómo desactivar un usuario

1. Vaya a **Usuarios** → seleccione el usuario
2. Cambie el estado a **Inactivo**

> **No elimine usuarios**: Al desactivarlos conserva el historial de todo lo que registraron.

### Cómo cambiar la contraseña de un usuario

1. Vaya a **Usuarios** → seleccione el usuario
2. Haga clic en **"Cambiar contraseña"**
3. Ingrese la nueva contraseña y **Guardar**

---

## 18. Acceso de campo (fiscales y capataces)

El acceso de campo permite a los trabajadores completar la Bitácora directamente desde su celular, sin necesidad de ir a la oficina ni tener una cuenta de correo.

### Paso 1 — Crear los accesos de campo

*El Administrador hace esto una vez por proyecto.*

1. Ingrese al proyecto → **Ficha del Proyecto** → sección **"Acceso de Campo"**
2. Haga clic en **"+ Agregar acceso de campo"**
3. Complete:
   - **Nombre completo** del fiscal o capataz
   - **Cargo** (Fiscal, Capataz, Inspector, etc.)
   - **PIN de acceso** (4 a 6 dígitos)
4. **Guardar**

Puede agregar tantos fiscales como necesite para cada proyecto.

### Paso 2 — Generar el código QR

1. En la sección **"Acceso de Campo"**, haga clic en **"Ver QR del proyecto"**
2. Aparece el código QR único de ese proyecto
3. Compártalo con los fiscales (WhatsApp, impreso en tablero de obra, etc.)

> **Importante:** El QR da acceso a ese proyecto específico. Todos los fiscales del proyecto usan el mismo QR pero cada uno tiene su PIN individual.

### Paso 3 — El fiscal accede desde su celular

1. El fiscal escanea el QR con la cámara del celular
2. Se abre la pantalla de acceso en el navegador
3. Ingresa su **PIN** (4 a 6 dígitos)
4. Accede directamente a la Bitácora de la obra
5. Completa la entrada del día y guarda

La interfaz está optimizada para celulares: letras grandes, botones amplios, funciona con datos móviles.

### ¿Qué puede hacer el fiscal desde su celular?

| Acción | Disponible |
|--------|:----------:|
| Ver entradas anteriores de la Bitácora | Sí |
| Crear nueva entrada del día | Sí |
| Registrar clima, personal, rubros, FODA | Sí |
| Pegar enlace de fotos | Sí |
| Ver otros módulos (financiero, presupuesto, etc.) | No |
| Acceder a otros proyectos | No |

### Cambiar o revocar el acceso de un fiscal

1. Vaya a **Ficha del Proyecto** → **Acceso de Campo**
2. Localice al fiscal y edite o desactive su acceso
3. El historial de sus registros de bitácora se conserva siempre

---

## 19. Acceso desde otras computadoras de la oficina

Cuando TEKÓGA está instalado en el ordenador principal, los demás equipos de la oficina acceden al sistema usando su **navegador web**, sin instalar nada adicional.

### Cómo conectarse desde otra computadora

1. Pregunte al Administrador la **dirección IP local** del ordenador servidor
   - El Administrador puede verla en: **Configuración** → sección **"Acceso desde la red"**
   - Se muestra automáticamente (Ej: `http://192.168.1.10:3000`)
2. En el otro ordenador, abra cualquier navegador web
3. Escriba esa dirección en la barra de navegación
4. Ingrese con su correo y contraseña habituales

### Condiciones necesarias

- Ambos equipos deben estar **conectados a la misma red WiFi** o cable de red
- El ordenador principal donde está TEKÓGA debe estar **encendido y con el sistema iniciado**
- No se necesita internet si solo se trabaja en módulos de oficina

### Recomendaciones para la red de oficina

- Conecte el ordenador servidor con **cable de red** (no WiFi) para mayor estabilidad
- Consulte a un técnico de redes para configurar una **IP estática** en el servidor, así la dirección no cambia al reiniciar el router

---

## 20. Preguntas frecuentes

**¿Qué pasa si el ordenador principal se apaga?**
Los usuarios en otros equipos pierden la conexión hasta que el servidor vuelva a encenderse. Los datos no se pierden.

**¿Necesito internet para usar el sistema?**
Los usuarios de oficina NO necesitan internet; trabajan en la red local. Los fiscales de campo SÍ necesitan datos móviles o WiFi para acceder desde su celular.

**¿Dónde se guardan mis datos?**
En el disco duro del ordenador principal donde está instalado TEKÓGA.

**¿Cómo hago una copia de seguridad?**
Vaya a **Administración** → **Copia de Seguridad** → **"Exportar backup"**. Se descarga un archivo con todos sus datos. Guárdelo en un pendrive, Google Drive o disco externo.

**¿Por qué el stock en Insumos Consolidados no coincide con lo que veo físicamente en bodega?**
El stock que muestra esa pestaña es *teórico*: calculado a partir de los avances declarados en Cómputo. Si hay materiales que llegaron a obra pero no se registraron como recepción, o avances cargados incorrectamente, habrá diferencias. Use la pestaña Control de Stock para comparar con un conteo físico real.

**¿Cuándo debería cargar avances de obra?**
Se recomienda hacerlo semanalmente o después de cada hito importante (terminación de una losa, cerramiento de muros, etc.). No es necesario registrar avances diariamente, pero la periodicidad mejora la precisión del control de materiales.

**¿El fiscal puede ver los datos financieros de la obra?**
No. El acceso de campo está absolutamente restringido a la Bitácora del proyecto específico.

**¿Qué pasa si el fiscal pierde el QR?**
Genere uno nuevo desde la Ficha del Proyecto. El QR por sí solo no da acceso; la seguridad real está en el PIN individual de cada fiscal.

**¿Puedo usar el sistema desde mi celular si soy director de proyecto?**
Sí, siempre que esté conectado a la misma red WiFi de la oficina. La interfaz se adapta a pantallas pequeñas, aunque la experiencia óptima es en computadora.

**¿Cuántos usuarios pueden usar el sistema al mismo tiempo?**
Depende del plan adquirido. Consulte con TekoInnova las especificaciones de su plan.

**¿El sistema funciona en Mac?**
Sí. TEKÓGA tiene instalador para Windows y para macOS.

---

*Para soporte técnico, contáctese con TekoInnova:*
*soporte@tekoinnova.com*
*tekoinnova.com*

---

*TEKOGA -- Manual de Usuario v2.0 -- Copyright 2026 TekoInnova -- Todos los derechos reservados*
