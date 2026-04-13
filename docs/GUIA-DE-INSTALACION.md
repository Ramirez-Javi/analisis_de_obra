# TEKÓGA — Guía de Instalación y Requisitos del Sistema

> **Centro de Mando para Empresas Constructoras**  
> Versión 1.0 · Abril 2026  
> Desarrollado por **TekoInnova** — Asunción, Paraguay

---

## Tabla de contenidos

1. [Antes de instalar — Información importante](#1-antes-de-instalar--información-importante)
2. [Requisitos de hardware](#2-requisitos-de-hardware)
3. [Sistemas operativos compatibles](#3-sistemas-operativos-compatibles)
4. [Requisitos de red](#4-requisitos-de-red)
5. [Instalación en Windows](#5-instalación-en-windows)
6. [Instalación en macOS](#6-instalación-en-macos)
7. [Configuración inicial (primer uso)](#7-configuración-inicial-primer-uso)
8. [Cómo iniciar y detener el sistema](#8-cómo-iniciar-y-detener-el-sistema)
9. [Desinstalación](#9-desinstalación)
10. [Solución de problemas comunes](#10-solución-de-problemas-comunes)

---

## 1. Antes de instalar — Información importante

### ¿En qué ordenador instalo TEKÓGA?

TEKÓGA debe instalarse **en un único ordenador** dentro de la empresa. Ese ordenador actúará como el *servidor local*: guardará todos los datos y permitirá que los demás equipos de la oficina se conecten.

**Elija el ordenador más adecuado según su situación:**

| Situación | Tipo de equipo recomendado | Resultado |
|-----------|---------------------------|-----------|
| Tiene un PC de escritorio dedicado a la gestión | PC de escritorio (desktop) ✅ Ideal | Más estable, siempre encendido |
| Solo tiene laptops disponibles | Laptop del director o administrador | Funciona, pero el sistema no está disponible cuando la laptop está apagada |
| Quiere máxima disponibilidad para los fiscales de campo | PC de escritorio que permanezca encendido en horario laboral | Los fiscales pueden enviar reportes en cualquier momento |

### Un solo ordenador por empresa

TEKÓGA se instala en **un solo ordenador por empresa**. Los demás equipos de la oficina acceden a través del navegador (como si fuera una página web interna). No instale TEKÓGA en múltiples computadoras de la misma empresa.

---

## 2. Requisitos de hardware

### Ordenador principal (servidor local) — Mínimos absolutos

| Componente | Mínimo para funcionar | Recomendado para uso cómodo |
|------------|----------------------|---------------------------|
| **Procesador** | Intel Core i3 (2ª gen.) o AMD A6 equivalente | Intel Core i5 (8ª gen.) o AMD Ryzen 5 · 4 núcleos o más |
| **Memoria RAM** | **4 GB** | **8 GB o más** |
| **Disco duro** | 10 GB disponibles | **SSD de 256 GB o más** (velocidad notablemente mejor) |
| **Pantalla** | 1366 × 768 px | 1920 × 1080 px (Full HD) |
| **Red** | Puerto Ethernet (RJ45) o WiFi 802.11n | **Cable Ethernet** + WiFi para los demás equipos |
| **Fuente de alimentación** | Estándar | **UPS / batería de respaldo** recomendada para obras en zonas con cortes frecuentes |

### Ordenadores de oficina (clientes — los que acceden al servidor)

Los otros equipos de la oficina que se conectan a TEKÓGA solo necesitan:

| Componente | Requisito |
|------------|-----------|
| **Procesador** | Cualquier equipo con menos de 10 años de antigüedad |
| **Memoria RAM** | 2 GB o más |
| **Navegador web** | Google Chrome, Mozilla Firefox, Microsoft Edge o Safari (versión 2022 o posterior) |
| **Conexión** | Conectado a la misma red WiFi o cable que el servidor |
| **Instalación de software** | **Ninguna** — solo el navegador |

### Celulares (para fiscales y capataces en campo)

| Componente | Requisito |
|------------|-----------|
| **Sistema operativo** | Android 8.0 o superior / iOS 13 o superior |
| **Navegador** | Chrome, Safari o Firefox (incluidos en el sistema operativo) |
| **Conexión de datos** | Datos móviles 3G/4G o WiFi con acceso a internet |
| **Cámara** | Para escanear el código QR (cualquier cámara moderna funciona) |
| **Instalación de app** | **Ninguna** — acceso desde el navegador |

### ¿Por qué la RAM es tan importante?

TEKÓGA corre un motor de base de datos PostgreSQL y un servidor web Next.js simultáneamente en el mismo equipo. Con menos de 4 GB de RAM, el sistema puede volverse lento o inestable, especialmente si se conectan varios usuarios al mismo tiempo.

**Con 8 GB de RAM** puede trabajar cómodamente con 5 a 7 usuarios simultáneos sin problemas de rendimiento.

---

## 3. Sistemas operativos compatibles

### Para el ordenador principal (servidor)

| Sistema operativo | Compatible | Notas |
|-------------------|:----------:|-------|
| **Windows 10** (64-bit) | ✅ | Versión 1903 o posterior |
| **Windows 11** (64-bit) | ✅ | Recomendado |
| **Windows 7 / 8 / 8.1** | ❌ | No compatible. Sin soporte de Microsoft ni de las dependencias del sistema |
| **Windows 32-bit** | ❌ | No compatible |
| **macOS 11 Big Sur** | ✅ | |
| **macOS 12 Monterey** | ✅ | |
| **macOS 13 Ventura** | ✅ | |
| **macOS 14 Sonoma** | ✅ | Recomendado en Mac |
| **macOS 10.15 Catalina** | ⚠️ | Puede funcionar, no garantizado |
| **macOS versiones anteriores** | ❌ | No compatible |
| **Linux** | ❌ | No se ofrece instalador para Linux en esta versión |

> **Advertencia:** No instale TEKÓGA en ordenadores con Windows 7 u 8. Estos sistemas operativos ya no reciben actualizaciones de seguridad de Microsoft, lo que representa un riesgo para sus datos. Además, las dependencias del sistema requieren Windows 10 o superior.

### ¿Cómo verificar la versión de Windows?

1. Presione las teclas `Windows + R` en su teclado
2. Escriba `winver` y presione Enter
3. Verá una ventana con la versión exacta de Windows instalada

Para que sea compatible, debe decir **Windows 10** o **Windows 11** y ser de **64 bits**.

### ¿Cómo verificar si es 32 o 64 bits?

1. Haga clic derecho en el ícono **"Este equipo"** en el escritorio
2. Seleccione **"Propiedades"**
3. Busque la línea **"Tipo de sistema"** — debe decir **"Sistema operativo de 64 bits"**

---

## 4. Requisitos de red

### Para acceso desde la oficina (red local)

- Router WiFi doméstico o empresarial estándar
- El servidor y los equipos clientes deben estar en la **misma red** (mismo router)
- No se requiere configuración especial del router para el acceso básico
- Recomendado: conectar el servidor por **cable Ethernet** para mayor estabilidad

### Para acceso de campo (fiscales en obra)

- El servidor local necesita **conexión a internet activa** cuando los fiscales vayan a conectarse
- Se usa **Cloudflare Tunnel** (servicio gratuito) para crear una URL pública segura
- No se requiere abrir puertos en el router (el túnel sale hacia Cloudflare, no al revés)
- El fiscal solo necesita datos móviles en su celular (3G/4G)

### Ancho de banda recomendado

| Uso | Mínimo recomendado |
|-----|-------------------|
| Acceso de oficina (5 usuarios) | Red local — no se requiere internet |
| Acceso de campo (hasta 10 fiscales) | 10 Mbps de subida en el servidor |
| Acceso de campo con fotos | Las fotos van a Google Drive, no al servidor |

---

## 5. Instalación en Windows

### Paso 1 — Descargar el instalador

1. Vaya a **tekoinnova.com/descargar** desde cualquier navegador
2. Haga clic en **"Descargar para Windows"**
3. Se descargará un archivo con extensión `.exe` (ejemplo: `TEKOGA-Setup-1.0.0.exe`)
4. Espere a que la descarga termine completamente

> Si aparece una advertencia del navegador del tipo "Este archivo podría ser peligroso, ¿descargarlo de todas formas?", esto es normal para instaladores `.exe`. Haga clic en **"Mantener"** o **"Descargar de todas formas"**. El archivo está firmado digitalmente por TekoInnova.

### Paso 2 — Ejecutar el instalador

1. Abra la carpeta de **Descargas** de su ordenador
2. Haga **doble clic** en el archivo `TEKOGA-Setup-1.0.0.exe`
3. Si aparece el aviso de Windows **"¿Desea permitir que esta aplicación realice cambios en el dispositivo?"**, haga clic en **"Sí"**

> Este aviso es normal. Windows pregunta esto para cualquier instalador. Como descargó el archivo directamente desde tekoinnova.com, es seguro continuar.

### Paso 3 — Asistente de instalación

El asistente lo guiará paso a paso:

1. **Pantalla de bienvenida**: Haga clic en **"Siguiente"**
2. **Contrato de licencia**: Lea el contrato y marque **"Acepto los términos del contrato"** → **"Siguiente"**
3. **Carpeta de instalación**: Se sugiere `C:\Program Files\TekoInnova\TEKOGA`. Puede cambiarlo si lo desea → **"Siguiente"**
4. **Carpeta de datos**: Los datos de su empresa se guardarán en `C:\ProgramData\TekoInnova\`. Esta carpeta **NO debe moverse ni eliminarse** → **"Siguiente"**
5. **Acceso directo**: Marque si desea un ícono en el Escritorio → **"Siguiente"**
6. **Confirmar instalación**: Revise el resumen → **"Instalar"**
7. **Esperando**: La instalación puede tardar entre 2 y 5 minutos según la velocidad del equipo
8. **Finalizado**: Haga clic en **"Finalizar"**

### Paso 4 — Primera apertura

Después de instalar, TEKÓGA se abrirá automáticamente (o haga doble clic en el ícono del Escritorio).

La primera vez verá el **Asistente de configuración inicial** (vea la sección 7).

---

## 6. Instalación en macOS

### Paso 1 — Descargar el instalador

1. Vaya a **tekoinnova.com/descargar** desde su Mac
2. Haga clic en **"Descargar para macOS"**
3. Se descargará un archivo `.dmg` (ejemplo: `TEKOGA-1.0.0.dmg`)

### Paso 2 — Abrir el instalador

1. Vaya a la carpeta **Descargas** en el Finder
2. Haga doble clic en el archivo `.dmg`
3. Se abrirá una ventana con el ícono de TEKÓGA y una flecha hacia la carpeta **Aplicaciones**
4. Arrastre el ícono de TEKÓGA a la carpeta **Aplicaciones**
5. Espere a que se copie (puede tardar un momento)

### Paso 3 — Primera apertura en macOS

Si al abrir TEKÓGA aparece el mensaje:
*"TEKÓGA no puede abrirse porque proviene de un desarrollador no identificado"* o *"Apple no puede verificar si este software contiene código maligno"*

Haga lo siguiente:

1. Vaya a **Preferencias del Sistema** → **Privacidad y seguridad**
2. Desplácese hacia abajo y verá el mensaje sobre TEKÓGA
3. Haga clic en **"Abrir de todas formas"**
4. En el cuadro de confirmación, haga clic en **"Abrir"**

> Esta restricción de macOS afecta a aplicaciones distribuidas fuera de la Mac App Store. Es un proceso de un solo paso que solo ocurre la primera vez.

---

## 7. Configuración inicial (primer uso)

La primera vez que abra TEKÓGA verá el **Asistente de configuración inicial**.

### Paso 1 — Datos de su empresa

Complete la información de su empresa constructora o estudio:

- **Nombre de la empresa o estudio** *(obligatorio)*
- Eslogan o título *(opcional)*
- Dirección
- Teléfono
- Correo electrónico
- Sitio web
- Ciudad y país
- Logo *(puede subir una imagen; se usará en todos los reportes e impresiones)*

Haga clic en **"Siguiente"**.

### Paso 2 — Crear el usuario Administrador

Este será el usuario principal del sistema:

- **Nombre y apellido** *(obligatorio)*
- **Correo electrónico** *(obligatorio — este será su usuario de ingreso)*
- **Contraseña** *(obligatorio — mínimo 8 caracteres, use una segura)*
- **Confirmar contraseña**

> **Guarde bien estos datos.** Si pierde la contraseña del Administrador, recuperarla requiere asistencia técnica de TekoInnova.

Haga clic en **"Crear administrador"**.

### Paso 3 — Activar licencia *(si corresponde)*

- Si tiene un código de activación de su plan comprado, ingréselo aquí
- Si está en período de prueba, haga clic en **"Comenzar prueba de 10 días"**

### Paso 4 — Listo

El sistema está configurado. Se abrirá el **Centro de Mando** y podrá comenzar a trabajar.

---

## 8. Cómo iniciar y detener el sistema

### Iniciar TEKÓGA

- **Windows**: Haga doble clic en el ícono de TEKÓGA en el Escritorio, o búsquelo en el menú Inicio
- **macOS**: Haga clic en el ícono de TEKÓGA en el Dock o en la carpeta Aplicaciones

TEKÓGA tarda aproximadamente **15 a 30 segundos** en iniciar completamente la primera vez.

### Verificar que está funcionando correctamente

Cuando TEKÓGA esté iniciado verá:
- Una ventana con el sistema abierto (versión Electron/escritorio)
- En la barra de tareas (Windows) o en el Dock (Mac), el ícono de TEKÓGA
- Los usuarios de la red ya pueden acceder desde sus navegadores

### Detener TEKÓGA

Cierre la ventana principal de TEKÓGA normalmente. Antes de cerrar:

1. Asegúrese de que **ningún usuario esté trabajando** en ese momento
2. Avise a sus colegas que va a cerrar el sistema
3. Cierre normalmente con el botón ✕ (Windows) o ⌘ + Q (Mac)

> **No apague el ordenador sin cerrar TEKÓGA primero.** Aunque los datos están protegidos contra pérdidas, un corte abrupto puede demorar el inicio siguiente mientras la base de datos se recupera.

### Inicio automático con Windows

Para que TEKÓGA se inicie automáticamente cuando encienda el ordenador:
1. Abra TEKÓGA → **Configuración** → **Sistema**
2. Active la opción **"Iniciar automáticamente con Windows"**

Esta opción es especialmente útil si el ordenador con el servidor se reinicia después de un corte de luz.

---

## 9. Desinstalación

### En Windows

1. Vaya al **Panel de control** → **Programas** → **Desinstalar un programa**
2. Busque **"TEKÓGA"** en la lista
3. Haga clic en **"Desinstalar"**
4. Siga los pasos del asistente de desinstalación

> **Importante:** La desinstalación elimina el programa pero **NO elimina sus datos** almacenados en `C:\ProgramData\TekoInnova\`. Si desea eliminar también los datos, deberá hacerlo manualmente una vez desinstalado el programa.

### En macOS

1. Vaya a la carpeta **Aplicaciones** en el Finder
2. Busque **TEKÓGA** y arrástrelo a la Papelera
3. Vacíe la Papelera

Los datos se almacenan en `~/Library/Application Support/TekoInnova/`. Para eliminarlos, siga la ruta con el Finder (presione `⌘ + Shift + G` y escriba la ruta).

---

## 10. Solución de problemas comunes

### El sistema tarda mucho en iniciar

**Causa probable:** El ordenador tiene poca RAM o el disco es lento (HDD en vez de SSD).  
**Solución:**
- Cierre otros programas que no esté usando
- Reinicie el ordenador antes de iniciar TEKÓGA
- Considere ampliar la RAM a 8 GB o cambiar a un SSD

### Los otros equipos de la oficina no pueden acceder al sistema

**Verificación paso a paso:**
1. ¿El ordenador principal (servidor) está encendido y TEKÓGA está iniciado? → Verifique
2. ¿Los equipos están en la misma red WiFi o cable? → Verifique
3. ¿Está usando la IP correcta? → El Administrador puede verla en **Configuración** → **Usuarios** → **Acceso desde la red**
4. ¿El firewall de Windows está bloqueando TEKÓGA? → Vaya a **Panel de control** → **Firewall de Windows** → **Permitir una aplicación a través del Firewall** → Asegúrese de que **TEKÓGA** esté en la lista con ✅ en ambas columnas (Privada y Pública)

### Los fiscales no pueden acceder con el QR

**Verificación:**
1. ¿El ordenador principal tiene internet? → Verifique la conexión
2. ¿El servidor de túnel está activo? → En **Ficha del proyecto** → **Acceso de campo**, verifique el estado del túnel
3. ¿El fiscal está escribiendo bien su PIN? → Verifique el número asignado
4. ¿El QR escaneado corresponde al proyecto correcto? → Regenere el QR

### La contraseña de un usuario no funciona

- El Administrador puede restablecerla desde **Configuración** → **Usuarios** → seleccionar el usuario → **Cambiar contraseña**

### El sistema muestra un error después de un corte de luz

Los cortes de luz abruptos pueden dejar la base de datos en un estado de recuperación. TEKÓGA detecta esto automáticamente al iniciar y ejecuta una recuperación. Puede tardar entre 30 segundos y 2 minutos.

Si el error persiste, reinicie el ordenador e intente nuevamente. Si persiste el error, contacte a soporte.

### No puedo instalar en Windows — dice que necesita permisos de Administrador

Haga clic derecho en el instalador `.exe` y seleccione **"Ejecutar como administrador"**. Luego siga el proceso de instalación normal.

---

*Para soporte técnico, contáctese con TekoInnova:*  
*📧 soporte@tekoinnova.com*  
*📱 WhatsApp: [número del equipo de soporte]*  
*🌐 tekoinnova.com*

---

*TEKÓGA — Guía de Instalación v1.0 · © 2026 TekoInnova · Todos los derechos reservados*
