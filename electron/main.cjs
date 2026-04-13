const { app, BrowserWindow, dialog } = require("electron");
const { spawn } = require("node:child_process");
const fs = require("node:fs");
const http = require("node:http");
const net = require("node:net");
const path = require("node:path");

let mainWindow;
let serverProcess;
let serverLog = "";

function escapeHtml(value) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function appendServerLog(chunk) {
  serverLog = `${serverLog}${chunk}`;

  if (serverLog.length > 12000) {
    serverLog = serverLog.slice(-12000);
  }
}

function getServerDirectory() {
  if (app.isPackaged) {
    return path.join(process.resourcesPath, "app");
  }

  return path.join(app.getAppPath(), "dist-electron", "app");
}

function getAppTitle() {
  return "TEKOGA";
}

function createLoadingWindow() {
  mainWindow = new BrowserWindow({
    width: 1440,
    height: 900,
    minWidth: 1200,
    minHeight: 760,
    title: "TEKOGA",
    backgroundColor: "#f3f2eb",
    show: false,
    autoHideMenuBar: true,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  mainWindow.once("ready-to-show", () => {
    mainWindow.show();
  });

  const loadingHtml = `
    <html>
      <body style="margin:0;display:grid;place-items:center;background:#f3f2eb;color:#1f2937;font-family:Segoe UI,sans-serif;">
        <div style="text-align:center;max-width:520px;padding:32px;">
          <div style="letter-spacing:.2em;font-size:12px;text-transform:uppercase;color:#857255;">TEKOGA</div>
          <h1 style="margin:16px 0 8px;font-size:38px;">Iniciando aplicacion</h1>
          <p style="margin:0;font-size:16px;line-height:1.6;color:#4b5563;">Se esta levantando el servidor interno de Next.js para cargar la interfaz de escritorio.</p>
        </div>
      </body>
    </html>
  `;

  void mainWindow.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(loadingHtml)}`);
}

function showFatalError(error) {
  const details = escapeHtml(error instanceof Error ? error.stack || error.message : String(error));
  const logs = escapeHtml(serverLog || "Sin salida del servidor.");

  const errorHtml = `
    <html>
      <body style="margin:0;background:#1f1711;color:#f9fafb;font-family:Segoe UI,sans-serif;">
        <div style="max-width:980px;margin:0 auto;padding:40px 24px;">
          <div style="letter-spacing:.2em;font-size:12px;text-transform:uppercase;color:#f0b87a;">TEKOGA</div>
          <h1 style="margin:16px 0 12px;font-size:34px;">No se pudo iniciar la aplicacion</h1>
          <p style="margin:0 0 24px;color:#d1d5db;line-height:1.6;">El instalador se ejecuto, pero el servidor interno no logro arrancar. El detalle mas comun en este proyecto es una variable de entorno faltante o un problema de acceso a PostgreSQL.</p>
          <h2 style="font-size:18px;margin:0 0 12px;">Detalle tecnico</h2>
          <pre style="white-space:pre-wrap;background:#111827;border-radius:14px;padding:16px;line-height:1.5;overflow:auto;">${details}</pre>
          <h2 style="font-size:18px;margin:24px 0 12px;">Salida del servidor</h2>
          <pre style="white-space:pre-wrap;background:#111827;border-radius:14px;padding:16px;line-height:1.5;overflow:auto;">${logs}</pre>
        </div>
      </body>
    </html>
  `;

  if (mainWindow) {
    void mainWindow.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(errorHtml)}`);
  }

  dialog.showErrorBox(getAppTitle(), error instanceof Error ? error.message : String(error));
}

function waitForServer(url, timeoutMs) {
  return new Promise((resolve, reject) => {
    const startedAt = Date.now();

    const probe = () => {
      const request = http.get(url, (response) => {
        response.resume();

        if (response.statusCode && response.statusCode < 500) {
          resolve();
          return;
        }

        if (Date.now() - startedAt >= timeoutMs) {
          reject(new Error(`Timeout esperando al servidor en ${url}`));
          return;
        }

        setTimeout(probe, 500);
      });

      request.on("error", () => {
        if (Date.now() - startedAt >= timeoutMs) {
          reject(new Error(`Timeout esperando al servidor en ${url}`));
          return;
        }

        setTimeout(probe, 500);
      });
    };

    probe();
  });
}

function getAvailablePort() {
  return new Promise((resolve, reject) => {
    const server = net.createServer();

    server.listen(0, "127.0.0.1", () => {
      const address = server.address();

      if (!address || typeof address === "string") {
        server.close(() => reject(new Error("No se pudo resolver un puerto local libre.")));
        return;
      }

      const { port } = address;
      server.close((closeError) => {
        if (closeError) {
          reject(closeError);
          return;
        }

        resolve(port);
      });
    });

    server.on("error", reject);
  });
}

async function startInternalServer() {
  const serverDir = getServerDirectory();
  const serverScript = path.join(serverDir, "server.js");

  if (!fs.existsSync(serverScript)) {
    throw new Error(`No se encontro el servidor de Next empaquetado en ${serverScript}. Ejecuta npm run electron:build:win para regenerar dist-electron.`);
  }

  const port = await getAvailablePort();
  const serverUrl = `http://127.0.0.1:${port}`;
  const nodePathEntries = [];

  if (app.isPackaged) {
    nodePathEntries.push(path.join(process.resourcesPath, "app.asar", "node_modules"));
  }

  nodePathEntries.push(path.join(serverDir, "node_modules"));

  if (process.env.NODE_PATH) {
    nodePathEntries.push(process.env.NODE_PATH);
  }

  const runtimeNodePath = nodePathEntries.join(path.delimiter);

  serverProcess = spawn(process.execPath, [serverScript], {
    cwd: serverDir,
    windowsHide: true,
    env: {
      ...process.env,
      ELECTRON_RUN_AS_NODE: "1",
      HOSTNAME: "127.0.0.1",
      NODE_PATH: runtimeNodePath,
      NODE_ENV: "production",
      NEXT_TELEMETRY_DISABLED: "1",
      PORT: String(port),
      AUTH_TRUST_HOST: "1",
      NEXTAUTH_URL: serverUrl,
      AUTH_URL: serverUrl,
      ELECTRON_RESOURCES_PATH: app.isPackaged
        ? process.resourcesPath
        : path.join(app.getAppPath(), "resources"),
    },
    stdio: ["ignore", "pipe", "pipe"],
  });

  serverProcess.stdout.on("data", (chunk) => {
    appendServerLog(chunk.toString());
  });

  serverProcess.stderr.on("data", (chunk) => {
    appendServerLog(chunk.toString());
  });

  serverProcess.once("exit", (code) => {
    if (!mainWindow?.webContents.isLoadingMainFrame()) {
      return;
    }

    showFatalError(new Error(`El servidor interno finalizo prematuramente con codigo ${code ?? "desconocido"}.`));
  });

  await waitForServer(serverUrl, 45000);
  return serverUrl;
}

async function boot() {
  createLoadingWindow();

  try {
    const serverUrl = await startInternalServer();
    await mainWindow.loadURL(serverUrl);
  } catch (error) {
    showFatalError(error);
  }
}

app.whenReady().then(boot);

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});

app.on("before-quit", () => {
  if (serverProcess && !serverProcess.killed) {
    serverProcess.kill();
  }
});

app.on("activate", () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    void boot();
  }
});