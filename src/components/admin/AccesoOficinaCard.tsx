"use client";

import { useEffect, useState } from "react";
import { Check, Copy, Loader2, Monitor, QrCode, RefreshCw, Wifi } from "lucide-react";
import QRCode from "qrcode";

export function AccesoOficinaCard() {
  const [urls, setUrls] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [qrImgs, setQrImgs] = useState<Record<string, string>>({});
  const [copied, setCopied] = useState<string | null>(null);
  const [showQr, setShowQr] = useState<string | null>(null);

  async function cargar() {
    setLoading(true);
    try {
      const res = await fetch("/api/local-url");
      const data: { urls?: string[] } = await res.json();
      const lista = data.urls ?? [];
      setUrls(lista);

      // Generar QR para cada URL
      const imgs: Record<string, string> = {};
      for (const url of lista) {
        imgs[url] = await QRCode.toDataURL(url, {
          margin: 2,
          width: 200,
          color: { dark: "#0f172a", light: "#ffffff" },
        });
      }
      setQrImgs(imgs);
    } catch {
      setUrls([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { cargar(); }, []);

  function handleCopy(url: string) {
    navigator.clipboard.writeText(url).catch(() => {});
    setCopied(url);
    setTimeout(() => setCopied(null), 2000);
  }

  return (
    <div className="rounded-2xl border dark:border-teal-500/20 border-teal-200 dark:bg-teal-500/5 bg-teal-50/30 p-5">
      {/* Header */}
      <div className="flex items-center justify-between mb-1">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-teal-500/15 text-teal-500 flex items-center justify-center shrink-0">
            <Wifi size={17} />
          </div>
          <div>
            <p className="text-sm font-semibold dark:text-slate-100 text-slate-800">
              Acceso red local (oficina)
            </p>
            <p className="text-[11px] dark:text-slate-500 text-slate-400">
              Las otras PCs de la misma red WiFi se conectan con este enlace
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={cargar}
          disabled={loading}
          title="Actualizar IPs"
          className="p-1.5 rounded-lg dark:hover:bg-slate-800 hover:bg-white dark:text-slate-500 text-slate-400 transition-colors disabled:opacity-50"
        >
          <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
        </button>
      </div>

      <div className="mt-4">
        {loading ? (
          <div className="flex items-center gap-2 text-xs dark:text-slate-500 text-slate-400 py-1">
            <Loader2 size={13} className="animate-spin" />
            Detectando dirección IP de la red…
          </div>
        ) : urls.length === 0 ? (
          <div className="text-xs dark:text-slate-500 text-slate-400 py-1">
            No se detectó ninguna red WiFi activa.{" "}
            <span className="dark:text-slate-300 text-slate-600">
              Verificá que esta PC esté conectada a la red de oficina.
            </span>
          </div>
        ) : (
          <div className="space-y-3">
            <p className="text-[11px] dark:text-slate-500 text-slate-400">
              Copiá el enlace o mostrá el QR en las otras PCs. Todos deben estar en la misma red WiFi.
            </p>
            {urls.map((url) => (
              <div key={url} className="rounded-xl border dark:border-white/[0.07] border-slate-200 dark:bg-slate-900/60 bg-white p-3">
                <div className="flex items-center gap-2 mb-2">
                  <Monitor size={13} className="text-teal-500 shrink-0" />
                  <code className="flex-1 text-xs font-mono dark:text-teal-300 text-teal-700 truncate">
                    {url}
                  </code>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleCopy(url)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border dark:border-white/[0.08] border-slate-200 dark:text-slate-300 text-slate-600 dark:hover:bg-slate-800 hover:bg-slate-50 transition-colors"
                  >
                    {copied === url ? <Check size={12} className="text-teal-500" /> : <Copy size={12} />}
                    {copied === url ? "¡Copiado!" : "Copiar enlace"}
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowQr(showQr === url ? null : url)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border dark:border-white/[0.08] border-slate-200 dark:text-slate-300 text-slate-600 dark:hover:bg-slate-800 hover:bg-slate-50 transition-colors"
                  >
                    <QrCode size={12} />
                    {showQr === url ? "Ocultar QR" : "Ver QR"}
                  </button>
                </div>

                {showQr === url && qrImgs[url] && (
                  <div className="mt-3 flex flex-col items-center gap-2">
                    <img
                      src={qrImgs[url]}
                      alt={`QR ${url}`}
                      className="w-40 h-40 rounded-xl border dark:border-white/10 border-slate-200"
                    />
                    <p className="text-[10px] dark:text-slate-500 text-slate-400 text-center">
                      Escanealo con el celular o cámara de la otra PC para abrir el enlace
                    </p>
                  </div>
                )}
              </div>
            ))}

            <div className="rounded-lg dark:bg-slate-800/60 bg-slate-100 px-3 py-2.5 text-[11px] dark:text-slate-400 text-slate-500 leading-relaxed">
              <strong className="dark:text-slate-300 text-slate-600">Cómo conectar una PC nueva:</strong>
              {" "}Abrí el navegador en esa PC, ingresá el enlace de arriba, y usá el usuario y contraseña que le asignaste desde esta pantalla.
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
