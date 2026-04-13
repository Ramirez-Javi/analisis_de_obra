"use client";

import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import {
  Check, Copy, Loader2, QrCode, Wifi, WifiOff, Users, Plus, Trash2,
  KeyRound, Download, X,
} from "lucide-react";
import QRCode from "qrcode";
import { toast } from "sonner";
import {
  getCampoAccesos,
  crearCampoAcceso,
  actualizarPinCampoAcceso,
  eliminarCampoAcceso,
  type CampoAccesoRow,
} from "@/app/proyectos/[id]/campo/actions";

type TunnelStatus = "idle" | "starting" | "active" | "error";

interface TunnelState {
  status: TunnelStatus;
  url: string | null;
  error: string | null;
}

const inputCls =
  "w-full rounded-lg border dark:border-white/[0.1] border-slate-200 dark:bg-slate-800/60 bg-white px-3 py-2 text-sm dark:text-slate-100 text-slate-800 placeholder:dark:text-slate-600 placeholder:text-slate-400 focus:outline-none focus:ring-1 dark:focus:ring-teal-500 focus:ring-teal-600 transition";

// ── Componente: fila de acceso de campo ──────────────────────────────────
function FilaTrabajador({
  trabajador,
  proyectoId,
  campoUrl,
  onRefresh,
}: {
  trabajador: CampoAccesoRow;
  proyectoId: string;
  campoUrl: string | null;
  onRefresh: () => void;
}) {
  const [editPin, setEditPin] = useState(false);
  const [nuevoPin, setNuevoPin] = useState("");
  const [qrModal, setQrModal] = useState(false);
  const [qrImg, setQrImg] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleCambiarPin(e: React.FormEvent) {
    e.preventDefault();
    if (!/^\d{4,6}$/.test(nuevoPin)) {
      toast.error("PIN debe tener 4 a 6 dígitos numéricos");
      return;
    }
    startTransition(async () => {
      const r = await actualizarPinCampoAcceso(trabajador.id, proyectoId, nuevoPin);
      if (!r.ok) toast.error(r.error);
      else {
        toast.success("PIN actualizado");
        setEditPin(false);
        setNuevoPin("");
        onRefresh();
      }
    });
  }

  function handleEliminar() {
    if (!confirm(`¿Eliminar el acceso de ${trabajador.nombre} ${trabajador.apellido}?`)) return;
    startTransition(async () => {
      const r = await eliminarCampoAcceso(trabajador.id, proyectoId);
      if (!r.ok) toast.error(r.error);
      else { toast.success("Acceso eliminado"); onRefresh(); }
    });
  }

  async function handleVerQR() {
    if (!campoUrl) { toast.error("Activá el acceso de campo primero para ver el QR"); return; }
    const qr = await QRCode.toDataURL(campoUrl, {
      margin: 2, width: 220,
      color: { dark: "#0f172a", light: "#ffffff" },
    });
    setQrImg(qr);
    setQrModal(true);
  }

  async function handleDescargarQR() {
    if (!campoUrl) { toast.error("Activá el acceso de campo primero"); return; }
    const qr = await QRCode.toDataURL(campoUrl, {
      margin: 2, width: 400,
      color: { dark: "#0f172a", light: "#ffffff" },
    });
    const a = document.createElement("a");
    a.href = qr;
    a.download = `QR-campo-${trabajador.nombre.replace(/\s/g, "-")}.png`;
    a.click();
  }

  return (
    <>
      <div className="rounded-xl border dark:border-white/[0.07] border-slate-200 dark:bg-slate-800/40 bg-slate-50 px-4 py-3">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full dark:bg-slate-700 bg-slate-200 flex items-center justify-center shrink-0">
            <span className="text-xs font-bold dark:text-slate-300 text-slate-600">
              {trabajador.nombre.charAt(0).toUpperCase()}
            </span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold dark:text-slate-100 text-slate-800 truncate">
              {trabajador.nombre} {trabajador.apellido}
            </p>
            <p className="text-[10px] dark:text-slate-500 text-slate-400 mt-0.5">
              {trabajador.activo ? "Activo" : "Inactivo"}
            </p>
          </div>
          <div className="flex items-center gap-1 shrink-0">
            <button
              type="button"
              onClick={handleVerQR}
              title="Ver QR"
              className="p-1.5 rounded-lg dark:hover:bg-slate-700 hover:bg-slate-200 dark:text-teal-400 text-teal-600 transition-colors"
            >
              <QrCode size={14} />
            </button>
            <button
              type="button"
              onClick={() => setEditPin(!editPin)}
              title="Cambiar PIN"
              className="p-1.5 rounded-lg dark:hover:bg-slate-700 hover:bg-slate-200 dark:text-slate-400 text-slate-500 transition-colors"
            >
              <KeyRound size={14} />
            </button>
            <button
              type="button"
              onClick={handleEliminar}
              disabled={isPending}
              title="Eliminar acceso"
              className="p-1.5 rounded-lg dark:hover:bg-red-500/10 hover:bg-red-50 text-red-500 disabled:opacity-50 transition-colors"
            >
              <Trash2 size={14} />
            </button>
          </div>
        </div>

        {editPin && (
          <form onSubmit={handleCambiarPin} className="mt-3 flex gap-2">
            <input
              type="password"
              inputMode="numeric"
              value={nuevoPin}
              onChange={(e) => setNuevoPin(e.target.value.replace(/\D/g, "").slice(0, 6))}
              placeholder="Nuevo PIN (4–6 dígitos)"
              maxLength={6}
              className="flex-1 rounded-lg border dark:border-white/[0.1] border-slate-200 dark:bg-slate-800 bg-white px-3 py-1.5 text-sm dark:text-slate-100 text-slate-800 focus:outline-none focus:ring-1 dark:focus:ring-teal-500 focus:ring-teal-600 font-mono tracking-widest"
            />
            <button
              type="submit"
              disabled={isPending || nuevoPin.length < 4}
              className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-teal-600 hover:bg-teal-500 text-white disabled:opacity-60 transition-colors"
            >
              {isPending ? <Loader2 size={12} className="animate-spin" /> : <Check size={12} />}
            </button>
            <button
              type="button"
              onClick={() => { setEditPin(false); setNuevoPin(""); }}
              className="px-2 py-1.5 rounded-lg text-xs dark:text-slate-500 text-slate-400 hover:dark:text-slate-300 hover:text-slate-600"
            >
              <X size={12} />
            </button>
          </form>
        )}
      </div>

      {/* Modal QR */}
      {qrModal && qrImg && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
          onClick={() => setQrModal(false)}
        >
          <div
            className="bg-white dark:bg-slate-900 rounded-2xl p-6 shadow-2xl max-w-xs w-full mx-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <p className="text-sm font-bold dark:text-slate-100 text-slate-800">
                {trabajador.nombre} {trabajador.apellido}
              </p>
              <button type="button" onClick={() => setQrModal(false)} className="text-slate-400 hover:text-slate-600">
                <X size={16} />
              </button>
            </div>
            <div className="flex justify-center mb-3">
              <img src={qrImg} alt="QR" className="rounded-xl w-44 h-44 border dark:border-white/10" />
            </div>
            <p className="text-[10px] text-center dark:text-slate-500 text-slate-400 mb-4">
              Escaneá el QR y luego ingresá el PIN asignado
            </p>
            <button
              type="button"
              onClick={handleDescargarQR}
              className="w-full flex items-center justify-center gap-1.5 py-2 rounded-lg bg-teal-600 hover:bg-teal-500 text-white text-xs font-semibold transition-colors"
            >
              <Download size={12} /> Descargar QR
            </button>
          </div>
        </div>
      )}
    </>
  );
}

// ── Componente principal ──────────────────────────────────────────────────
export function AccesoCampoCard({ proyectoId }: { proyectoId: string }) {
  const [state, setState] = useState<TunnelState>({ status: "idle", url: null, error: null });
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const pollRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const mountedRef = useRef(true);

  // ── Accesos de campo ──────────────────────────────────────────────────────
  const [trabajadores, setTrabajadores] = useState<CampoAccesoRow[]>([]);
  const [loadingTrab, setLoadingTrab] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({ nombre: "", apellido: "", pin: "" });
  const [isPending, startTransition] = useTransition();

  async function cargarTrabajadores() {
    setLoadingTrab(true);
    try {
      const data = await getCampoAccesos(proyectoId);
      if (mountedRef.current) setTrabajadores(data);
    } catch {
      // sin acceso o error de red
    } finally {
      if (mountedRef.current) setLoadingTrab(false);
    }
  }

  useEffect(() => {
    mountedRef.current = true;
    cargarTrabajadores();
    return () => {
      mountedRef.current = false;
      if (pollRef.current) clearTimeout(pollRef.current);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function handleCrear(e: React.FormEvent) {
    e.preventDefault();
    if (!formData.nombre.trim()) { toast.error("Nombre requerido"); return; }
    if (!/^\d{4,6}$/.test(formData.pin)) { toast.error("PIN debe tener 4 a 6 dígitos"); return; }
    startTransition(async () => {
      const r = await crearCampoAcceso(proyectoId, {
        nombre: formData.nombre,
        apellido: formData.apellido,
        pin: formData.pin,
      });
      if (!r.ok) { toast.error(r.error); }
      else {
        toast.success("Acceso creado");
        setShowForm(false);
        setFormData({ nombre: "", apellido: "", pin: "" });
        cargarTrabajadores();
      }
    });
  }

  // ── Tunnel ────────────────────────────────────────────────────────────────
  const campoUrl = state.url ? `${state.url}/campo/${proyectoId}` : null;

  const fetchStatus = useCallback(async () => {
    try {
      const res = await fetch("/api/tunnel");
      if (!res.ok) return;
      const data: TunnelState = await res.json();
      if (!mountedRef.current) return;
      setState(data);
      if (data.url) {
        const url = `${data.url}/campo/${proyectoId}`;
        const qr = await QRCode.toDataURL(url, { margin: 1, width: 200, color: { dark: "#0f172a", light: "#ffffff" } });
        if (mountedRef.current) setQrDataUrl(qr);
      } else {
        setQrDataUrl(null);
      }
      if (data.status === "starting") pollRef.current = setTimeout(fetchStatus, 1500);
    } catch { /* offline */ }
  }, [proyectoId]);

  useEffect(() => { fetchStatus(); }, [fetchStatus]);

  const handleStart = async () => {
    if (pollRef.current) clearTimeout(pollRef.current);
    setActionLoading(true);
    try {
      await fetch("/api/tunnel", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "start" }) });
      setState((s) => ({ ...s, status: "starting" }));
      pollRef.current = setTimeout(fetchStatus, 1500);
    } finally { setActionLoading(false); }
  };

  const handleStop = async () => {
    if (pollRef.current) clearTimeout(pollRef.current);
    setActionLoading(true);
    try {
      await fetch("/api/tunnel", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "stop" }) });
      setState({ status: "idle", url: null, error: null });
      setQrDataUrl(null);
    } finally { setActionLoading(false); }
  };

  const handleCopy = () => {
    if (campoUrl) {
      navigator.clipboard.writeText(campoUrl).catch(() => {});
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const isActive = state.status === "active";
  const isStarting = state.status === "starting";

  return (
    <div className="space-y-4">
      {/* ══ BLOQUE 1: URL / TUNNEL ══════════════════════════════════════════ */}
      <div className="rounded-2xl border dark:border-white/[0.06] border-slate-200 dark:bg-slate-900/40 bg-white p-5 shadow-sm dark:shadow-none">
        <div className="flex items-center gap-3 mb-4">
          <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
            isActive ? "bg-teal-500/15 text-teal-400" : "dark:bg-slate-800 bg-slate-100 dark:text-slate-400 text-slate-500"
          }`}>
            {isActive ? <Wifi size={17} /> : <WifiOff size={17} />}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold dark:text-slate-100 text-slate-800">Acceso Remoto (QR)</p>
            <p className="text-[11px] dark:text-slate-500 text-slate-400">
              Enlace público para celulares fuera de la red WiFi de oficina
            </p>
          </div>
          {isActive && (
            <span className="flex items-center gap-1.5 text-[10px] font-semibold bg-teal-500/15 text-teal-400 px-2.5 py-1 rounded-full shrink-0">
              <span className="w-1.5 h-1.5 rounded-full bg-teal-400 animate-pulse" />
              Activo
            </span>
          )}
        </div>

        {state.status === "idle" && (
          <div className="space-y-3">
            <p className="text-xs dark:text-slate-500 text-slate-400 leading-relaxed">
              Genera un enlace temporal via Cloudflare Tunnel. El fiscal escanea el QR con su celular,
              ingresa su PIN y accede a la bitácora del proyecto en tiempo real.
            </p>
            <button type="button" onClick={handleStart} disabled={actionLoading}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-teal-600 hover:bg-teal-500 disabled:opacity-60 text-white text-xs font-semibold transition-colors">
              {actionLoading ? <Loader2 size={12} className="animate-spin" /> : <QrCode size={12} />}
              Activar acceso de campo
            </button>
            {state.error && <p className="text-xs text-red-500 dark:text-red-400">{state.error}</p>}
          </div>
        )}

        {isStarting && (
          <div className="flex items-center gap-2.5 text-xs dark:text-slate-400 text-slate-500 py-1">
            <Loader2 size={14} className="animate-spin text-teal-500 shrink-0" />
            Estableciendo tunnel… esto puede tardar unos segundos.
          </div>
        )}

        {isActive && campoUrl && (
          <div className="space-y-3">
            {qrDataUrl && (
              <div className="flex justify-center py-1">
                <img src={qrDataUrl} alt="QR de campo"
                  className="rounded-xl border dark:border-white/[0.08] border-slate-200 w-44 h-44" />
              </div>
            )}
            <div className="flex items-center gap-2">
              <code className="flex-1 text-[11px] bg-slate-100 dark:bg-slate-800 rounded-lg px-3 py-2 font-mono dark:text-teal-300 text-teal-700 truncate">
                {campoUrl}
              </code>
              <button type="button" onClick={handleCopy} title="Copiar enlace"
                className="shrink-0 flex items-center gap-1 px-2.5 py-2 rounded-lg border dark:border-white/[0.1] border-slate-200 dark:text-slate-400 text-slate-500 hover:bg-slate-100 dark:hover:bg-white/[0.05] transition-colors">
                {copied ? <Check size={13} className="text-teal-500" /> : <Copy size={13} />}
              </button>
            </div>
            <button type="button" onClick={handleStop} disabled={actionLoading}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-red-500/30 text-red-500 dark:text-red-400 hover:bg-red-500/10 disabled:opacity-60 text-xs font-semibold transition-colors">
              {actionLoading ? <Loader2 size={12} className="animate-spin" /> : <WifiOff size={12} />}
              Desactivar tunnel
            </button>
          </div>
        )}

        {state.status === "error" && (
          <div className="space-y-3">
            <p className="text-xs text-red-500 dark:text-red-400">{state.error ?? "Error al iniciar el tunnel."}</p>
            <button type="button" onClick={handleStart} disabled={actionLoading}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-teal-600 hover:bg-teal-500 disabled:opacity-60 text-white text-xs font-semibold transition-colors">
              {actionLoading ? <Loader2 size={12} className="animate-spin" /> : <QrCode size={12} />}
              Reintentar
            </button>
          </div>
        )}
      </div>

      {/* ══ BLOQUE 2: TRABAJADORES DE CAMPO ════════════════════════════════ */}
      <div className="rounded-2xl border dark:border-white/[0.06] border-slate-200 dark:bg-slate-900/40 bg-white p-5 shadow-sm dark:shadow-none">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Users size={15} className="text-teal-500" />
            <p className="text-sm font-semibold dark:text-slate-100 text-slate-800">Trabajadores de campo</p>
          </div>
          <button type="button" onClick={() => setShowForm(!showForm)}
            className="flex items-center gap-1 text-xs font-semibold text-teal-500 hover:text-teal-400 transition-colors">
            <Plus size={13} /> Nuevo
          </button>
        </div>

        <p className="text-[11px] dark:text-slate-500 text-slate-400 mb-4 leading-relaxed">
          Creá un acceso por fiscal o capataz. Cada uno recibe un PIN único.
          Al escanear el QR del proyecto e ingresar su PIN, acceden directamente a la bitácora.
        </p>

        {showForm && (
          <form onSubmit={handleCrear}
            className="rounded-xl border dark:border-teal-500/20 border-teal-200 dark:bg-teal-500/5 bg-teal-50/50 p-4 mb-4 space-y-3">
            <p className="text-xs font-semibold dark:text-teal-300 text-teal-700 flex items-center gap-1.5">
              <Plus size={12} /> Nuevo trabajador de campo
            </p>
            <div className="grid grid-cols-2 gap-2">
              <input type="text" placeholder="Nombre *" value={formData.nombre}
                onChange={(e) => setFormData(f => ({ ...f, nombre: e.target.value }))} required className={inputCls} />
              <input type="text" placeholder="Apellido" value={formData.apellido}
                onChange={(e) => setFormData(f => ({ ...f, apellido: e.target.value }))} className={inputCls} />
            </div>
            <div className="flex gap-2">
              <input type="password" inputMode="numeric" placeholder="PIN (4–6 dígitos)"
                value={formData.pin} maxLength={6}
                onChange={(e) => setFormData(f => ({ ...f, pin: e.target.value.replace(/\D/g, "").slice(0, 6) }))}
                required className={`${inputCls} font-mono tracking-widest`} />
              <button type="submit" disabled={isPending || !formData.nombre || formData.pin.length < 4}
                className="px-4 py-2 rounded-lg text-xs font-semibold bg-teal-600 hover:bg-teal-500 text-white disabled:opacity-60 transition-colors whitespace-nowrap">
                {isPending ? <Loader2 size={12} className="animate-spin" /> : "Crear"}
              </button>
              <button type="button" onClick={() => { setShowForm(false); setFormData({ nombre: "", apellido: "", pin: "" }); }}
                className="px-2 py-2 rounded-lg text-xs dark:text-slate-500 text-slate-400 hover:dark:text-slate-300">
                <X size={13} />
              </button>
            </div>
          </form>
        )}

        {loadingTrab ? (
          <div className="flex items-center gap-2 text-xs dark:text-slate-500 text-slate-400 py-2">
            <Loader2 size={13} className="animate-spin" /> Cargando trabajadores…
          </div>
        ) : trabajadores.length === 0 && !showForm ? (
          <div className="text-center py-6 text-xs dark:text-slate-500 text-slate-400">
            <p>No hay trabajadores de campo creados.</p>
            <button type="button" onClick={() => setShowForm(true)}
              className="mt-2 text-teal-500 hover:text-teal-400 font-semibold">
              + Crear el primero
            </button>
          </div>
        ) : (
          <div className="space-y-2">
            {trabajadores.map((t) => (
              <FilaTrabajador key={t.id} trabajador={t} proyectoId={proyectoId} campoUrl={campoUrl} onRefresh={cargarTrabajadores} />
            ))}
          </div>
        )}

        {!isActive && trabajadores.length > 0 && (
          <p className="text-[10px] dark:text-slate-600 text-slate-400 mt-3 text-center">
            ↑ Activá el acceso remoto para que los fiscales puedan escanear el QR fuera de la red
          </p>
        )}
      </div>
    </div>
  );
}
