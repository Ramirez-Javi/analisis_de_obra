# TEKÓGA — Manual de Usuario

> **Centro de Mando para Empresas Constructoras**  
> Versión 1.0 · Abril 2026  
> Desarrollado por **TekoInnova** — Asunción, Paraguay

---

## Tabla de contenidos

1. [¿Qué es TEKÓGA?](#1-qué-es-tekóga)
2. [Tipos de usuarios](#2-tipos-de-usuarios)
3. [Cómo iniciar sesión](#3-cómo-iniciar-sesión)
4. [El Centro de Mando (pantalla principal)](#4-el-centro-de-mando-pantalla-principal)
5. [Módulo 1 — Proyectos y Ficha Técnica](#5-módulo-1--proyectos-y-ficha-técnica)
6. [Módulo 2 — Presupuesto](#6-módulo-2--presupuesto)
7. [Módulo 3 — Cronograma](#7-módulo-3--cronograma)
8. [Módulo 4 — Estado Financiero](#8-módulo-4--estado-financiero)
9. [Módulo 5 — Mano de Obra](#9-módulo-5--mano-de-obra)
10. [Módulo 6 — Logística](#10-módulo-6--logística)
11. [Módulo 7 — Compras](#11-módulo-7--compras)
12. [Módulo 8 — Inventario y As-Built](#12-módulo-8--inventario-y-as-built)
13. [Módulo 9 — Bitácora de Obra](#13-módulo-9--bitácora-de-obra)
14. [Módulo 10 — Reportes](#14-módulo-10--reportes)
15. [Administración de usuarios](#15-administración-de-usuarios)
16. [Acceso de campo (fiscales y capataces)](#16-acceso-de-campo-fiscales-y-capataces)
17. [Acceso desde otras computadoras de la oficina](#17-acceso-desde-otras-computadoras-de-la-oficina)
18. [Preguntas frecuentes](#18-preguntas-frecuentes)

---

## 1. ¿Qué es TEKÓGA?

**TEKÓGA** es el sistema de gestión integral para obras de construcción desarrollado por TekoInnova. Permite a las empresas constructoras gestionar en un solo lugar toda la información de sus proyectos: presupuestos, cronogramas, finanzas, personal, materiales, bitácora de obra y reportes.

### ¿Cómo funciona?

La aplicación se instala en **un solo ordenador** de la empresa (al que llamamos el *servidor local*). Desde ese ordenador, los demás equipos de la empresa pueden acceder usando su navegador web, sin instalar nada. Los trabajadores en campo (fiscales, capataces) acceden desde su celular escaneando un código QR.

```
┌──────────────────────────────────────────────────┐
│  ORDENADOR PRINCIPAL (servidor local)            │
│  - Instala TEKÓGA aquí                           │
│  - Todos los datos se guardan en este disco      │
└──────────────────┬───────────────────────────────┘
                   │  Red WiFi de la oficina
         ┌─────────┼─────────────┐
         ▼         ▼             ▼
   [Director]  [Architecta]  [Contador]
   Ingresa al  Ingresa al    Ingresa al
   sistema     sistema       sistema
   desde su    desde su      desde su
   PC          laptop        PC
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
Es el usuario principal de la empresa. Puede hacer absolutamente todo:
- Crear, editar y eliminar proyectos
- Agregar y gestionar todos los usuarios del sistema
- Acceder a todos los módulos sin restricción
- Configurar el acceso de campo (fiscales)
- Ver todos los informes y exportar datos

> **Nota:** Debe existir al menos un usuario con rol Administrador en el sistema. Se recomienda tener máximo dos administradores para mayor seguridad.

### USUARIO (funcionario de oficina)
Empleado o colaborador de la empresa con acceso limitado a los módulos que el Administrador le asigne. Por ejemplo: solo ver Presupuesto y Financiero, pero no modificar datos de proyectos.

### FISCAL / CAPATAZ (acceso de campo)
Persona que trabaja en la obra. **No necesita email ni contraseña**. Accede escaneando el código QR de su proyecto + ingresando su PIN de 4 a 6 dígitos. Solo puede ver y completar la Bitácora de esa obra específica.

### VISITANTE / PROPIETARIO (futuro)
Acceso de solo lectura para el propietario del proyecto o clientes que quieran consultar el estado de la obra.

---

## 3. Cómo iniciar sesión

### Para usuarios de oficina (Administrador y Usuarios)

1. Abra su navegador web (Chrome, Firefox, Edge o Safari)
2. Escriba la dirección del sistema en la barra de navegación:
   - Si está usando el ordenador principal: `http://localhost:3000`
   - Si está en otro equipo de la red: `http://192.168.X.X:3000` (la IP que le indique el Administrador)
3. Verá la pantalla de inicio de sesión de TEKÓGA
4. Ingrese su **correo electrónico** y **contraseña**
5. Haga clic en **"Ingresar"**

> **Si olvidó su contraseña:** Comuníquese con el Administrador del sistema para que le restablezca el acceso.

### Para fiscales y capataces en campo

No necesita ningún correo ni contraseña. Siga las instrucciones de la sección [Acceso de campo](#16-acceso-de-campo-fiscales-y-capataces).

---

## 4. El Centro de Mando (pantalla principal)

Al ingresar con su cuenta, llegará al **Centro de Mando**: la pantalla principal desde donde accede a todos los proyectos y módulos.

### ¿Qué verá en el Centro de Mando?

- **Listado de proyectos**: Todos los proyectos de la empresa, con su estado (En ejecución, Pausado, Finalizado, etc.)
- **Acceso rápido**: Botones para ir directo a cada módulo de un proyecto
- **Indicadores generales**: Resumen de los proyectos activos
- **Menú de navegación**: Parte superior con acceso a configuración y perfil

### Barra de navegación superior

| Ícono / Botón | Qué hace |
|---------------|----------|
| Logo TEKÓGA | Vuelve al Centro de Mando desde cualquier pantalla |
| Nombre de usuario | Muestra opciones de perfil y cerrar sesión |
| Ícono de ajustes ⚙️ | Acceso a la configuración (solo ADMIN) |

---

## 5. Módulo 1 — Proyectos y Ficha Técnica

La **Ficha del Proyecto** es el núcleo del sistema. Todos los demás módulos (presupuesto, cronograma, financiero, etc.) pertenecen a un proyecto específico.

### Cómo crear un nuevo proyecto

1. En el Centro de Mando, haga clic en el botón **"+ Nuevo Proyecto"**
2. Complete los datos del formulario:
   - **Código del proyecto** (ejemplo: `PRY-2026-001`) — debe ser único
   - **Nombre del proyecto** (ejemplo: `Residencia García — San Lorenzo`)
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

Dentro de cada proyecto encontrará secciones para completar:

#### Propietarios
Datos del cliente o propietario de la obra. Puede agregar más de uno (en caso de copropiedad).
- Nombre completo
- Documento de identidad
- Teléfono y correo de contacto
- Dirección

#### Equipo Técnico
Los profesionales responsables del proyecto:
- Arquitecto/a responsable
- Director de obra
- Calculista estructural
- Ingeniero eléctrico, sanitario, etc.
- Cargo y datos de contacto de cada uno

#### Planos y Láminas
Sección para registrar los planos del proyecto:
- Código de lámina (Ej: `ARQ-01`)
- Descripción (Ej: `Planta baja — Distribución`)
- Escala
- Fecha de aprobación
- Enlace al archivo (Google Drive, OneDrive, etc.)

> **Importante:** Los archivos de planos NO se guardan dentro del sistema. Se recomienda subirlos a Google Drive o similar y pegar el enlace aquí. Esto evita que el disco del servidor se llene con archivos pesados.

#### Acceso de Campo
Esta sección aparece en la parte inferior de la ficha. Desde aquí se gestiona el acceso de los fiscales y capataces. Ver la sección [Acceso de campo](#16-acceso-de-campo-fiscales-y-capataces).

---

## 6. Módulo 2 — Presupuesto

El módulo de Presupuesto permite calcular el costo detallado de la obra, organizando los trabajos por rubros y calculando materiales, mano de obra y costos por m².

### Conceptos importantes

- **Rubro**: Un trabajo o partida de obra. Ejemplo: "Losa de H°A° e=0.20m", "Mampostería de ladrillo"
- **Receta**: La lista de materiales y mano de obra necesarios para ejecutar 1 unidad de ese rubro
- **Cómputo métrico**: Las cantidades de cada rubro según los planos del proyecto

### Flujo de trabajo en el presupuesto

1. **Seleccionar rubros**: Elija los rubros del catálogo maestro que aplican al proyecto
2. **Ingresar cantidades**: Escriba cuántas unidades de cada rubro tiene el proyecto (según medición de planos)
3. **Verificar precios**: El sistema toma los precios del catálogo maestro; puede ajustarlos por proyecto si los precios del mercado local son diferentes
4. **Calcular**: El sistema muestra automáticamente el subtotal por rubro y el total general
5. **Exportar**: Genere el presupuesto en formato PDF o CSV para presentar al cliente

### Catálogos (acceso desde el panel de administración)

- **Materiales Maestros**: Catálogo de todos los materiales con su precio de referencia y unidad de medida
- **Rubros Maestros**: Catálogo de todos los rubros con su receta (lista de materiales por unidad)
- **Mano de Obra**: Costos de mano de obra por categoría y unidad

> **Recomendación:** Actualice los precios del catálogo maestro al menos una vez por mes, especialmente en contextos de inflación. Los proyectos pueden tener precios propios que anulan el precio maestro.

---

## 7. Módulo 3 — Cronograma

El cronograma permite planificar las tareas de la obra en el tiempo y hacer seguimiento del avance.

### Cómo usar el cronograma

1. Ingrese al proyecto y haga clic en **"Cronograma"** en el menú lateral
2. Se muestra un listado de tareas con su duración y fechas
3. Para agregar una tarea, haga clic en **"+ Agregar tarea"**
4. Complete:
   - **Nombre de la tarea** (Ej: `Excavación y movimiento de suelo`)
   - **Fecha de inicio**
   - **Duración en días/semanas**
   - **Dependencias** (si esta tarea debe comenzar después de otra)
5. El sistema muestra el avance en % de cada tarea
6. Actualice el avance real conforme avanza la obra

### Vista Gantt

El cronograma se visualiza como un diagrama de barras (Gantt) donde puede ver de un vistazo:
- Qué tareas están en curso
- Cuáles están retrasadas (aparecen en rojo)
- El avance global del proyecto

---

## 8. Módulo 4 — Estado Financiero

Este módulo registra y controla todos los movimientos de dinero relacionados con el proyecto: ingresos del cliente, pagos a proveedores, gastos de obra y flujo de caja.

### Tipos de movimientos

| Tipo | Descripción | Ejemplo |
|------|-------------|---------|
| Ingreso | Dinero que entra | Anticipo del cliente, certificado de avance |
| Egreso | Dinero que sale | Pago a proveedor, pago de jornales |
| Factura | Documento de egreso con número de factura | Factura de ferretería |

### Cómo registrar un movimiento

1. Ingrese al proyecto → **Estado Financiero**
2. Haga clic en **"+ Nuevo movimiento"**
3. Seleccione el tipo (Ingreso / Egreso / Factura)
4. Complete:
   - **Fecha**
   - **Descripción**
   - **Monto**
   - **Categoría** (materiales, mano de obra, honorarios, etc.)
   - **Comprobante** (número de factura u orden de pago, si aplica)
5. **Guardar**

### Flujo de caja

El sistema muestra automáticamente el **saldo disponible** en todo momento:
```
Saldo = Total de ingresos − Total de egresos
```

Si el saldo es negativo aparece marcado en rojo como advertencia.

### Certificados de avance

Puede registrar los certificados de avance de obra que se presentan al cliente para cobrar. Cada certificado incluye:
- Número de certificado
- Período que cubre
- Monto cobrado
- Estado (Pendiente de pago / Pagado)

---

## 9. Módulo 5 — Mano de Obra

Registra el personal de obra, sus cargos, jornales y el costo total de la nómina.

### Cómo registrar personal de obra

1. Ingrese al proyecto → **Mano de Obra**
2. Haga clic en **"+ Agregar personal"**
3. Complete:
   - **Nombre y apellido**
   - **Cargo** (Peón, Oficial albañil, Capataz, etc.)
   - **Tipo de contratación** (jornal diario / semanal / por tarea)
   - **Monto del jornal**
   - **Fecha de ingreso**
4. **Guardar**

### Registro de asistencia y pagos

- Registre los días trabajados por cada persona
- El sistema calcula automáticamente el monto a pagar
- Marque los pagos realizados para llevar el control de deudas
- Vea el costo acumulado de mano de obra por semana y por mes

---

## 10. Módulo 6 — Logística

Permite planificar y hacer seguimiento de los recursos materiales necesarios para la obra: qué se necesita, cuándo, quién lo solicita.

### Solicitudes de materiales

1. Ingrese al proyecto → **Logística**
2. Cree una **solicitud de materiales**:
   - Fecha de necesidad
   - Lista de materiales requeridos y cantidades
   - Responsable de la solicitud
3. Asigne la solicitud a **Compras** para que gestione la adquisición
4. Haga seguimiento del estado: Pendiente → En gestión → Entregado

---

## 11. Módulo 7 — Compras

Gestión centralizada de proveedores y cotizaciones para el proyecto.

### Catálogo de proveedores

El catálogo de proveedores es **global** (compartido entre todos los proyectos). Para agregar un proveedor:

1. Vaya al menú principal → **Proveedores** (o desde el módulo de Compras)
2. Haga clic en **"+ Nuevo proveedor"**
3. Complete:
   - Nombre de la empresa
   - RUC o documento
   - Rubros que suministra (materiales de construcción, alquiler de maquinaria, etc.)
   - Contacto y dirección
4. **Guardar**

### Proceso de compra

1. Desde **Logística** llega una solicitud de materiales
2. En **Compras** genere cotizaciones con 2 o más proveedores
3. Apruebe la mejor cotización
4. Registre la orden de compra
5. Al recibir los materiales, pase a **Inventario** para registrar la recepción en bodega

---

## 12. Módulo 8 — Inventario y As-Built

Registra la recepción de materiales en obra y su instalación por ambiente/sector.

### Recepción en bodega

Cada vez que llega un camión con materiales:

1. Ingrese al proyecto → **Inventario**
2. Haga clic en **"+ Recepción en bodega"**
3. Seleccione el material del catálogo
4. Ingrese la cantidad recibida, unidad de medida, proveedor y fecha
5. **Guardar**

El sistema lleva el stock disponible en bodega para cada material.

### As-Built (instalación por ambiente)

Registre dónde se instaló cada material:

1. Seleccione el material y la cantidad instalada
2. Indique en qué ambiente o sector de la obra se instaló (Planta baja — Dormitorio 1, Baño principal, etc.)
3. El sistema descuenta del stock de bodega

Esto permite generar al final de la obra un **informe As-Built** que muestra exactamente qué material hay en cada parte de la construcción, útil para entregas al propietario y para mantenimiento futuro.

---

## 13. Módulo 9 — Bitácora de Obra

La Bitácora es el diario de la obra. Registra día a día lo que ocurre: condiciones climáticas, personal presente, trabajos ejecutados, problemas detectados y alertas de materiales.

### Acceso a la Bitácora

La Bitácora puede ser completada de dos maneras:
- **Desde la oficina**: Por un usuario del sistema con su cuenta normal
- **Desde el campo**: Por fiscales y capataces usando su celular (acceso con QR + PIN)

### Cómo crear una entrada en la Bitácora

1. Ingrese al proyecto → **Bitácora de Obra**
2. Haga clic en **"+ Nueva entrada"** o **"Entrada del día"**
3. Complete los campos:

#### Condición climática
Seleccione el estado del tiempo del día:
- ☀️ Soleado
- ⛅ Nublado
- 🌧️ Lluvioso
- 💨 Ventoso

#### Personal presente
Lista el personal que asistió a obra ese día. Puede escribir los nombres manualmente o seleccionar del registro de Mano de Obra.

#### Trabajos ejecutados
Descripción detallada de los trabajos realizados durante el día. Sea lo más específico posible:
- Qué se hizo
- En qué sector de la obra
- Avance estimado (porcentaje o m²)

#### FODA del día *(opcional)*
Análisis rápido de la jornada:
- **Fortalezas** (F): qué salió bien
- **Oportunidades** (O): qué se puede mejorar o aprovechar
- **Debilidades** (D): qué tuvo problemas
- **Amenazas** (A): riesgos identificados

#### Alertas de stock
Si detecta que falta algún material o está por agotarse, regístrelo aquí. Esto genera una notificación para el área de Compras/Logística.

#### Enlace de fotos
Las fotos se toman con el celular y se suben a Google Drive, OneDrive o similar. **Pegue aquí el enlace** al álbum o carpeta compartida.

> **¿Por qué no guardar fotos directamente en el sistema?** Las fotos de obra pueden ocupar gigabytes de espacio. Guardarlas en Google Drive o similar es gratis, ilimitado y permite compartirlas fácilmente con el cliente.

4. Haga clic en **"Guardar entrada"**

### Historial de la Bitácora

Puede ver todas las entradas anteriores ordenadas por fecha. Cada entrada muestra quién la registró (nombre del usuario o fiscal), facilitando la trazabilidad.

---

## 14. Módulo 10 — Reportes

El módulo de Reportes consolida la información de todos los módulos en documentos listos para imprimir o exportar.

### Tipos de reportes disponibles

| Reporte | Contenido |
|---------|-----------|
| Resumen del proyecto | Ficha técnica + cronograma + avance financiero |
| Estado financiero | Ingresos, egresos, saldo, certificados |
| Presupuesto ejecutado vs. estimado | Comparación de costos reales vs. presupuestados |
| Mano de obra | Nómina, asistencia y costos de personal |
| Inventario / As-Built | Stock y destino de materiales |
| Bitácora | Diario completo de obra en el período seleccionado |

### Cómo generar un reporte

1. Ingrese al proyecto → **Reportes**
2. Seleccione el tipo de reporte
3. Defina el período (si aplica): fecha desde / hasta
4. Haga clic en **"Generar"**
5. Opciones de salida:
   - **Ver en pantalla**: Para revisar antes de imprimir
   - **Exportar PDF**: Genera un archivo para guardar o enviar
   - **Exportar CSV**: Para abrir en Excel y hacer análisis adicionales
   - **Imprimir**: Imprime directamente desde el navegador

---

## 15. Administración de usuarios

Esta sección es solo para el **Administrador** del sistema.

### Cómo agregar un nuevo usuario

1. Vaya al menú → **Configuración** → **Usuarios**
2. Haga clic en **"+ Nuevo usuario"**
3. Complete:
   - Nombre y apellido
   - Correo electrónico (será su nombre de usuario)
   - Contraseña inicial (el usuario puede cambiarla después)
   - Rol: **Administrador** o **Usuario**
4. **Asignar permisos por módulo**: Marque los módulos a los que tendrá acceso
5. **Guardar**

El sistema enviará (o mostrará) las credenciales para que el nuevo usuario pueda ingresar.

### Permisos por módulo

Para cada usuario de tipo **Usuario** (no Admin), puede activar o desactivar el acceso a cada módulo individualmente:

| Módulo | Puede activarse/desactivarse |
|--------|:---:|
| Proyectos | ✅ |
| Presupuesto | ✅ |
| Cronograma | ✅ |
| Estado Financiero | ✅ |
| Mano de Obra | ✅ |
| Logística | ✅ |
| Compras | ✅ |
| Inventario | ✅ |
| Bitácora | ✅ |
| Reportes | ✅ |

Si un usuario intenta acceder a un módulo que no tiene habilitado, el sistema le muestra un mensaje de acceso denegado.

### Cómo desactivar un usuario

Si un empleado ya no trabaja en la empresa:

1. Vaya a **Usuarios**
2. Haga clic en el usuario a desactivar
3. Cambie el estado a **Inactivo** (o haga clic en "Desactivar")

> **No elimine usuarios**: Al desactivarlos conserva el historial de todo lo que registraron en el sistema. Eliminar un usuario puede borrar datos asociados.

### Cómo cambiar la contraseña de un usuario

1. Vaya a **Usuarios** → seleccione el usuario
2. Haga clic en **"Cambiar contraseña"**
3. Ingrese la nueva contraseña
4. **Guardar**

---

## 16. Acceso de campo (fiscales y capataces)

El acceso de campo permite a los trabajadores de la obra completar la Bitácora directamente desde su celular, sin necesidad de ir a la oficina ni tener una cuenta de correo.

### Paso 1 — Crear los accesos de campo

*El Administrador debe hacer esto una vez por proyecto.*

1. Ingrese al proyecto → **Ficha del Proyecto** → sección **"Acceso de Campo"**
2. Haga clic en **"+ Agregar acceso de campo"**
3. Complete:
   - **Nombre completo** del fiscal o capataz
   - **Cargo** (Fiscal, Capataz, Inspector, etc.)
   - **PIN de acceso** (4 a 6 dígitos) — elija un número que el fiscal pueda recordar fácilmente
4. **Guardar**

Puede agregar tantos fiscales como necesite para ese proyecto.

### Paso 2 — Generar el código QR

1. En la misma sección **"Acceso de Campo"**, haga clic en **"Ver QR del proyecto"**
2. Aparece el **código QR único** de ese proyecto
3. **Compartir el QR** con los fiscales:
   - Haga una captura de pantalla o imprima el QR
   - Envíelo por WhatsApp
   - O imprímalo y péguelo en un tablero en la obra

> **Importante:** El QR da acceso a la Bitácora del proyecto específico. Es el mismo QR para todos los fiscales del proyecto; cada uno se identifica con su PIN individual.

### Paso 3 — El fiscal accede desde su celular

1. El fiscal abre la cámara de su celular y escanea el QR
2. Se abre el navegador de su celular con la pantalla de acceso
3. Ingresa su **PIN** (4 a 6 dígitos)
4. Accede directamente a la Bitácora de la obra
5. Completa la entrada del día y guarda

La interfaz está optimizada para celulares: letras grandes, botones amplios y funciona con datos móviles.

### ¿Qué puede hacer el fiscal en su celular?

El fiscal solo puede acceder a la **Bitácora de su proyecto**. No puede ver financiero, presupuesto ni datos de otros proyectos.

Dentro de la Bitácora desde el celular puede:
- ✅ Ver las entradas anteriores del proyecto
- ✅ Crear una nueva entrada del día
- ✅ Registrar condición climática
- ✅ Listar personal presente
- ✅ Describir trabajos ejecutados
- ✅ Completar FODA del día
- ✅ Registrar alertas de stock
- ✅ Pegar enlace de fotos
- ❌ No puede acceder a otros módulos
- ❌ No puede ver otros proyectos

### Cambiar o revocar el acceso de un fiscal

Si un fiscal ya no trabaja en el proyecto o se quiere cambiar su PIN:

1. Vaya a **Ficha del Proyecto** → **Acceso de Campo**
2. Localice al fiscal en la lista
3. Haga clic en los tres puntos `...` o en el ícono de editar
4. Cambie el PIN o desactive el acceso

El historial de los registros de bitácora que hizo ese fiscal se conserva siempre.

---

## 17. Acceso desde otras computadoras de la oficina

Cuando TEKÓGA está instalado en el ordenador principal, los demás equipos de la oficina pueden acceder al sistema usando su **navegador web**, sin instalar nada adicional.

### Cómo conectarse desde otra computadora

1. Pregunte al Administrador la **dirección IP local** del ordenador donde está instalado el sistema
   - El Administrador puede verla en: **Configuración** → **Usuarios** → sección **"Acceso desde la red"**
   - Se muestra automáticamente (ejemplo: `http://192.168.1.10:3000`)
2. En el otro ordenador, abra cualquier navegador web
3. Escriba esa dirección en la barra de navegación (ejemplo: `http://192.168.1.10:3000`)
4. Verá la pantalla de inicio de sesión de TEKÓGA
5. Ingrese con su correo y contraseña

### Condiciones necesarias

Para que esto funcione:
- Ambos equipos deben estar **conectados a la misma red WiFi** o cable de red de la oficina
- El ordenador principal donde está TEKÓGA debe estar **encendido**
- El sistema TEKÓGA debe estar **iniciado** en el ordenador principal
- El ordenador consultante no necesita internet si solo va a trabajar en los módulos de oficina

### Recomendaciones para la red de oficina

- Conecte el ordenador principal (servidor) con **cable de red** (no WiFi), para que la conexión sea más estable
- Si tiene un router WiFi, la dirección IP del servidor puede cambiar después de reiniciar. Para fijarla permanentemente, consulte a un técnico de redes para configurar una **IP estática**
- Los demás equipos pueden usar WiFi normalmente

---

## 18. Preguntas frecuentes

**¿Qué pasa si el ordenador principal se apaga?**  
Los usuarios de oficina en otros equipos perderán la conexión hasta que el servidor vuelva a encenderse. Los datos no se pierden; simplemente no se puede acceder mientras está apagado.

**¿Necesito internet para usar el sistema?**  
Los usuarios de oficina NO necesitan internet; trabajan en la red local. Los fiscales de campo SÍ necesitan datos móviles o WiFi para acceder desde su celular.

**¿Dónde se guardan mis datos?**  
Todos los datos se guardan en el disco duro del ordenador principal donde está instalado TEKÓGA. No salen a internet, no van a servidores externos.

**¿Cómo hago una copia de seguridad?**  
Vaya a **Administración** → **Copia de Seguridad** → **"Exportar backup"**. Se descarga un archivo comprimido con todos sus datos. Guárdelo en un pendrive, en Google Drive o en un disco externo.

**¿Cuántos usuarios pueden usar el sistema al mismo tiempo?**  
Depende del plan adquirido. Consulte con TekoInnova las especificaciones de su plan.

**¿El sistema funciona en Mac?**  
Sí. TEKÓGA tiene instalador para Windows y para macOS.

**¿Puedo usar el sistema desde mi celular si soy director de proyecto?**  
Los usuarios de oficina pueden abrir el sistema en el navegador de su celular siempre que estén conectados a la misma red WiFi de la oficina. La interfaz se adapta a pantallas pequeñas, aunque la experiencia óptima es en una computadora.

**¿El fiscal puede ver los datos financieros de la obra?**  
No. El acceso de campo está absolutamente restringido a la Bitácora. El fiscal no puede ver presupuesto, finanzas, ni nada más allá de los registros diarios de obra.

**¿Qué pasa si el fiscal pierde el QR?**  
Genere uno nuevo desde la Ficha del Proyecto. El código QR no contiene información sensible por sí solo; la seguridad real está en el PIN individual de cada fiscal.

---

*Para soporte técnico, contáctese con TekoInnova:*  
*📧 soporte@tekoinnova.com*  
*📱 WhatsApp: [número del equipo de soporte]*  
*🌐 tekoinnova.com*

---

*TEKÓGA — Manual de Usuario v1.0 · © 2026 TekoInnova · Todos los derechos reservados*
