"use client";

import { signOut } from "next-auth/react";
import { useEffect, useState } from "react";
import Link from "next/link";
import { LogOut, Users, ChevronDown, Shield } from "lucide-react";

interface UserMenuProps {
  name: string;
  email: string;
  role: string;
}

export function UserMenu({ name, email, role }: UserMenuProps) {
  const [time, setTime] = useState("");
  const [open, setOpen] = useState(false);

  // Reloj en tiempo real
  useEffect(() => {
    function tick() {
      const now = new Date();
      setTime(
        now.toLocaleString("es-PY", {
          day: "2-digit",
          month: "2-digit",
          year: "numeric",
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
          hour12: false,
        })
      );
    }
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);

  const initials = name
    .split(" ")
    .slice(0, 2)
    .map((n) => n.charAt(0).toUpperCase())
    .join("");

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-2 px-2 py-1.5 rounded-xl hover:dark:bg-slate-800/60 hover:bg-slate-100 transition-colors duration-150 outline-none focus-visible:ring-2 focus-visible:ring-teal-500"
        aria-expanded={open}
        aria-haspopup="true"
      >
        {/* Avatar */}
        <div className="w-7 h-7 rounded-full bg-gradient-to-br from-teal-500 to-cyan-600 flex items-center justify-center text-[11px] font-bold text-white shrink-0">
          {initials || "?"}
        </div>
        {/* Nombre + hora (se ocultan en pantallas muy pequeñas) */}
        <div className="hidden sm:flex flex-col items-start leading-none gap-0.5">
          <span className="text-xs font-semibold dark:text-slate-200 text-slate-700">{name}</span>
          <span className="text-[10px] font-mono dark:text-slate-500 text-slate-400 tabular-nums">{time}</span>
        </div>
        <ChevronDown
          size={13}
          className={`dark:text-slate-500 text-slate-400 transition-transform duration-200 ${open ? "rotate-180" : ""}`}
        />
      </button>

      {/* Dropdown */}
      {open && (
        <>
          {/* Overlay para cerrar */}
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-full mt-2 w-60 z-50 rounded-2xl border dark:border-white/[0.08] border-slate-200 dark:bg-slate-900 bg-white shadow-2xl shadow-slate-300/30 dark:shadow-black/40 overflow-hidden">
            {/* Info del usuario */}
            <div className="px-4 py-3 border-b dark:border-white/[0.06] border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-full bg-gradient-to-br from-teal-500 to-cyan-600 flex items-center justify-center text-sm font-bold text-white shrink-0">
                  {initials}
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-semibold dark:text-slate-100 text-slate-800 truncate">{name}</p>
                  <p className="text-[11px] dark:text-slate-500 text-slate-400 truncate">{email}</p>
                  <span className={`inline-block text-[10px] font-semibold px-1.5 py-0.5 rounded-full mt-0.5 ${
                    role === "ADMIN"
                      ? "dark:bg-teal-500/15 bg-teal-50 dark:text-teal-300 text-teal-700"
                      : "dark:bg-slate-700/50 bg-slate-100 dark:text-slate-400 text-slate-500"
                  }`}>
                    {role === "ADMIN" ? "Administrador" : "Usuario"}
                  </span>
                </div>
              </div>
              {/* Reloj en el dropdown también */}
              <p className="text-[10px] font-mono dark:text-slate-600 text-slate-400 mt-2 tabular-nums">{time}</p>
            </div>

            {/* Acciones */}
            <div className="py-1.5">
              {role === "ADMIN" && (
                <Link
                  href="/admin/usuarios"
                  onClick={() => setOpen(false)}
                  className="flex items-center gap-2.5 px-4 py-2.5 text-sm dark:text-slate-300 text-slate-700 dark:hover:bg-slate-800 hover:bg-slate-50 transition-colors"
                >
                  <Users size={14} className="dark:text-slate-500 text-slate-400" />
                  Gestionar usuarios
                </Link>
              )}
              <button
                onClick={() => signOut({ callbackUrl: "/login" })}
                className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm dark:text-red-400 text-red-600 dark:hover:bg-red-500/10 hover:bg-red-50 transition-colors"
              >
                <LogOut size={14} />
                Cerrar sesión
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

// ── Versión compacta para barras de proyecto ───────────────────────────────
export function UserBadge({ name, role }: { name: string; role: string }) {
  const [time, setTime] = useState("");

  useEffect(() => {
    function tick() {
      const now = new Date();
      setTime(
        now.toLocaleString("es-PY", {
          day: "2-digit",
          month: "2-digit",
          hour: "2-digit",
          minute: "2-digit",
          hour12: false,
        })
      );
    }
    tick();
    const id = setInterval(tick, 30000);
    return () => clearInterval(id);
  }, []);

  const initials = name
    .split(" ")
    .slice(0, 2)
    .map((n) => n.charAt(0).toUpperCase())
    .join("");

  return (
    <div className="hidden sm:flex items-center gap-2 ml-auto">
      {time && (
        <span className="text-[10px] font-mono dark:text-slate-600 text-slate-400 tabular-nums">
          {time}
        </span>
      )}
      <div className="flex items-center gap-1.5 px-2 py-1 rounded-lg dark:bg-slate-800/60 bg-slate-100">
        {role === "ADMIN" && <Shield size={10} className="dark:text-teal-400 text-teal-600" />}
        <span className="text-[11px] font-medium dark:text-slate-300 text-slate-600">{name}</span>
      </div>
    </div>
  );
}
