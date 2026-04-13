"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Lock, Delete, ArrowRight, Loader2 } from "lucide-react";

interface Props {
  proyectoId: string;
  proyectoNombre: string;
  proyectoCodigo: string;
}

export function PinForm({ proyectoId, proyectoNombre, proyectoCodigo }: Props) {
  const [digits, setDigits] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  // Botones del teclado
  const KEYS = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "back", "0", "enter"];
  const MAX_DIGITS = 6;

  function handleKey(key: string) {
    if (key === "back") {
      setDigits((d) => d.slice(0, -1));
      setError(null);
      return;
    }
    if (key === "enter") {
      if (digits.length < 4) return;
      submit(digits.join(""));
      return;
    }
    if (digits.length >= MAX_DIGITS) return;
    setDigits((d) => [...d, key]);
    setError(null);
  }

  function submit(pin: string) {
    startTransition(async () => {
      try {
        const res = await fetch("/api/campo/auth", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ proyectoId, pin }),
        });
        const data = await res.json();
        if (!res.ok) {
          setError(data.error ?? "PIN incorrecto");
          setDigits([]);
        } else {
          router.replace(`/campo/${proyectoId}/bitacora`);
        }
      } catch {
        setError("Error de conexión. Verifique su señal.");
      }
    });
  }

  const inputRef = useRef<HTMLInputElement>(null);

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center px-6 py-10">
      {/* Logo / Header */}
      <div className="mb-8 text-center">
        <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-br from-teal-500 to-cyan-600 shadow-lg shadow-teal-500/25 mb-4">
          <Lock className="w-7 h-7 text-white" />
        </div>
        <p className="text-[10px] font-bold uppercase tracking-[.3em] text-teal-400 mb-1">
          Acceso de Campo
        </p>
        <h1 className="text-xl font-bold text-white leading-tight">{proyectoNombre}</h1>
        <p className="text-xs text-slate-500 mt-0.5">{proyectoCodigo}</p>
      </div>

      {/* Indicador de dígitos */}
      <div className="flex items-center gap-3 mb-8">
        {Array.from({ length: MAX_DIGITS }).map((_, i) => (
          <div
            key={i}
            className={`w-4 h-4 rounded-full transition-all duration-150 ${
              i < digits.length
                ? "bg-teal-400 scale-110"
                : "bg-slate-700 scale-100"
            }`}
          />
        ))}
        {/* Input oculto para teclado físico en desktop */}
        <input
          ref={inputRef}
          type="password"
          inputMode="numeric"
          className="sr-only"
          value={digits.join("")}
          onChange={(e) => {
            const val = e.target.value.replace(/\D/g, "").slice(0, MAX_DIGITS);
            setDigits(val.split(""));
            if (val.length >= 4) submit(val);
          }}
          maxLength={MAX_DIGITS}
        />
      </div>

      {/* Error */}
      {error && (
        <div className="mb-4 px-4 py-2.5 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm text-center">
          {error}
        </div>
      )}

      {/* Mensaje cuando se ha ingresado suficiente */}
      {digits.length >= 4 && !error && !isPending && (
        <p className="text-xs text-slate-500 mb-4">
          Presioná <span className="text-teal-400 font-semibold">✓</span> para ingresar
        </p>
      )}

      {/* Teclado numérico */}
      <div className="grid grid-cols-3 gap-3 w-full max-w-[280px]">
        {KEYS.map((key) => {
          if (key === "back") {
            return (
              <button
                key={key}
                type="button"
                onClick={() => handleKey("back")}
                disabled={isPending || digits.length === 0}
                className="h-16 rounded-2xl flex items-center justify-center bg-slate-800 text-slate-300 text-lg font-medium active:scale-95 transition-all disabled:opacity-40"
              >
                <Delete className="w-5 h-5" />
              </button>
            );
          }
          if (key === "enter") {
            return (
              <button
                key={key}
                type="button"
                onClick={() => handleKey("enter")}
                disabled={isPending || digits.length < 4}
                className="h-16 rounded-2xl flex items-center justify-center bg-teal-600 text-white font-bold active:scale-95 transition-all disabled:opacity-40 shadow-lg shadow-teal-600/30"
              >
                {isPending ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <ArrowRight className="w-5 h-5" />
                )}
              </button>
            );
          }
          return (
            <button
              key={key}
              type="button"
              onClick={() => handleKey(key)}
              disabled={isPending || digits.length >= MAX_DIGITS}
              className="h-16 rounded-2xl flex items-center justify-center bg-slate-800 hover:bg-slate-700 text-white text-2xl font-semibold active:scale-95 transition-all disabled:opacity-40 select-none"
            >
              {key}
            </button>
          );
        })}
      </div>

      <p className="mt-8 text-xs text-slate-600 text-center max-w-[220px]">
        Ingresá el PIN asignado por el administrador de la empresa
      </p>
    </div>
  );
}
