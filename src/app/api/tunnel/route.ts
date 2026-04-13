import { type NextRequest, NextResponse } from "next/server";
import { spawn, type ChildProcess } from "child_process";
import path from "path";
import fs from "fs";
import { auth } from "@/lib/auth";

// ─── Singleton de estado (persiste mientras el proceso del servidor esté vivo) ─

let tunnelProcess: ChildProcess | null = null;
let tunnelUrl: string | null = null;
let tunnelStatus: "idle" | "starting" | "active" | "error" = "idle";
let tunnelError: string | null = null;

function getCloudflaredPath(): string | null {
  // Ruta en producción (Electron empaquetado)
  const resEnv = process.env.ELECTRON_RESOURCES_PATH;
  if (resEnv) {
    const exePath = path.join(resEnv, "cloudflared.exe");
    if (fs.existsSync(exePath)) return exePath;
  }
  // Fallback para desarrollo
  const devPath = path.join(process.cwd(), "resources", "cloudflared.exe");
  if (fs.existsSync(devPath)) return devPath;
  return null;
}

function stopTunnel() {
  if (tunnelProcess) {
    try { tunnelProcess.kill(); } catch { /* ignore */ }
    tunnelProcess = null;
  }
  tunnelUrl = null;
  tunnelStatus = "idle";
  tunnelError = null;
}

// ─── GET: estado actual ───────────────────────────────────────────────────────

export async function GET() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }
  return NextResponse.json({
    status: tunnelStatus,
    url: tunnelUrl,
    error: tunnelError,
  });
}

// ─── POST: start / stop ───────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  let body: { action?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Cuerpo JSON inválido" }, { status: 400 });
  }

  const { action } = body;

  if (action === "start") {
    // Ya hay un tunnel activo o arrancando
    if (tunnelProcess) {
      return NextResponse.json({ status: tunnelStatus, url: tunnelUrl });
    }

    const cloudflaredPath = getCloudflaredPath();
    if (!cloudflaredPath) {
      return NextResponse.json(
        { error: "cloudflared.exe no encontrado. Asegúrese de que el binario está en resources/" },
        { status: 500 },
      );
    }

    const port = process.env.PORT ?? "3000";
    tunnelStatus = "starting";
    tunnelUrl = null;
    tunnelError = null;

    tunnelProcess = spawn(cloudflaredPath, ["tunnel", "--url", `http://127.0.0.1:${port}`], {
      windowsHide: true,
    });

    // cloudflared escribe la URL en stderr
    tunnelProcess.stderr?.on("data", (chunk: Buffer) => {
      const text = chunk.toString();
      const match = text.match(/https:\/\/[a-z0-9-]+\.trycloudflare\.com/);
      if (match && tunnelStatus !== "active") {
        tunnelUrl = match[0];
        tunnelStatus = "active";
      }
    });

    tunnelProcess.stdout?.on("data", (chunk: Buffer) => {
      const text = chunk.toString();
      const match = text.match(/https:\/\/[a-z0-9-]+\.trycloudflare\.com/);
      if (match && tunnelStatus !== "active") {
        tunnelUrl = match[0];
        tunnelStatus = "active";
      }
    });

    tunnelProcess.on("exit", (code) => {
      tunnelProcess = null;
      if (tunnelStatus !== "idle") {
        if (code !== 0 && tunnelStatus === "starting") {
          tunnelStatus = "error";
          tunnelError = `cloudflared salió con código ${code ?? "?"}`;
        } else {
          tunnelStatus = "idle";
        }
        tunnelUrl = null;
      }
    });

    tunnelProcess.on("error", (err) => {
      tunnelStatus = "error";
      tunnelError = err.message;
      tunnelUrl = null;
      tunnelProcess = null;
    });

    return NextResponse.json({ status: "starting" });
  }

  if (action === "stop") {
    stopTunnel();
    return NextResponse.json({ status: "idle" });
  }

  return NextResponse.json({ error: "Acción no válida. Use 'start' o 'stop'." }, { status: 400 });
}
