"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Building2, Mail, Lock, User, Eye, EyeOff, UserPlus } from "lucide-react";
import { toast } from "sonner";
import { registrarUsuario } from "@/app/registro/actions";

const inputCls =
  "w-full pl-10 pr-4 py-2.5 rounded-xl text-sm border dark:border-white/[0.08] border-slate-200 dark:bg-slate-800/60 bg-white dark:text-slate-100 text-slate-800 dark:placeholder:text-slate-600 placeholder:text-slate-300 focus:outline-none focus:ring-2 focus:ring-teal-500/40 transition-all";

export function RegistroForm() {
  const router = useRouter();
  const [form, setForm] = useState({
    nombre: "",
    apellido: "",
    email: "",
    password: "",
    confirmPassword: "",
  });
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);

  function set(field: keyof typeof form, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (form.password !== form.confirmPassword) {
      toast.error("Las contraseñas no coinciden.");
      return;
    }

    setLoading(true);
    const toastId = toast.loading("Creando cuenta...");

    try {
      const result = await registrarUsuario({
        nombre: form.nombre,
        apellido: form.apellido,
        email: form.email,
        password: form.password,
      });

      if (!result.ok) {
        toast.error(result.error, { id: toastId });
        return;
      }

      toast.success("Cuenta creada exitosamente. Iniciá sesión.", {
        id: toastId,
        duration: 3000,
      });
      await new Promise((r) => setTimeout(r, 1200));
      router.push("/login");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center dark:bg-slate-950 bg-slate-50 px-4 py-10">
      <div className="w-full max-w-md">
        {/* Brand */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-br from-teal-500 to-cyan-600 shadow-lg shadow-teal-500/30 mb-4">
            <Building2 size={26} className="text-white" />
          </div>
          <h1 className="text-2xl font-bold dark:text-white text-slate-900">TEKOINNOVA</h1>
          <p className="text-sm dark:text-slate-400 text-slate-500 mt-1">
            Registro de Administrador — Configuración Inicial
          </p>
        </div>

        {/* Card */}
        <div className="rounded-2xl border dark:border-white/[0.06] border-slate-200 dark:bg-slate-900/60 bg-white shadow-xl shadow-slate-200/50 dark:shadow-none p-8">
          <h2 className="text-base font-semibold dark:text-slate-100 text-slate-800 mb-1">
            Crear cuenta de administrador
          </h2>
          <p className="text-xs dark:text-slate-500 text-slate-400 mb-6">
            Esta cuenta tendrá acceso total al sistema y podrá gestionar usuarios.
          </p>

          <form onSubmit={handleSubmit} noValidate className="space-y-4">
            {/* Nombre + Apellido */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium dark:text-slate-400 text-slate-500 mb-1.5">
                  Nombre <span className="text-teal-500">*</span>
                </label>
                <div className="relative">
                  <User size={15} className="absolute left-3 top-1/2 -translate-y-1/2 dark:text-slate-500 text-slate-400" />
                  <input
                    type="text"
                    value={form.nombre}
                    onChange={(e) => set("nombre", e.target.value)}
                    placeholder="Juan"
                    required
                    autoComplete="given-name"
                    className={inputCls}
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium dark:text-slate-400 text-slate-500 mb-1.5">
                  Apellido
                </label>
                <div className="relative">
                  <User size={15} className="absolute left-3 top-1/2 -translate-y-1/2 dark:text-slate-500 text-slate-400" />
                  <input
                    type="text"
                    value={form.apellido}
                    onChange={(e) => set("apellido", e.target.value)}
                    placeholder="Pérez"
                    autoComplete="family-name"
                    className={inputCls}
                  />
                </div>
              </div>
            </div>

            {/* Email */}
            <div>
              <label className="block text-xs font-medium dark:text-slate-400 text-slate-500 mb-1.5">
                Correo electrónico <span className="text-teal-500">*</span>
              </label>
              <div className="relative">
                <Mail size={15} className="absolute left-3 top-1/2 -translate-y-1/2 dark:text-slate-500 text-slate-400" />
                <input
                  type="email"
                  value={form.email}
                  onChange={(e) => set("email", e.target.value)}
                  placeholder="admin@empresa.com"
                  required
                  autoComplete="email"
                  className={inputCls}
                />
              </div>
            </div>

            {/* Contraseña */}
            <div>
              <label className="block text-xs font-medium dark:text-slate-400 text-slate-500 mb-1.5">
                Contraseña <span className="text-teal-500">*</span>
              </label>
              <div className="relative">
                <Lock size={15} className="absolute left-3 top-1/2 -translate-y-1/2 dark:text-slate-500 text-slate-400" />
                <input
                  type={showPass ? "text" : "password"}
                  value={form.password}
                  onChange={(e) => set("password", e.target.value)}
                  placeholder="Mínimo 8 caracteres"
                  required
                  autoComplete="new-password"
                  className={`${inputCls} pr-10`}
                />
                <button
                  type="button"
                  onClick={() => setShowPass((s) => !s)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 dark:text-slate-500 text-slate-400 hover:text-teal-500 transition-colors"
                  aria-label={showPass ? "Ocultar contraseña" : "Mostrar contraseña"}
                >
                  {showPass ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
            </div>

            {/* Confirmar contraseña */}
            <div>
              <label className="block text-xs font-medium dark:text-slate-400 text-slate-500 mb-1.5">
                Confirmar contraseña <span className="text-teal-500">*</span>
              </label>
              <div className="relative">
                <Lock size={15} className="absolute left-3 top-1/2 -translate-y-1/2 dark:text-slate-500 text-slate-400" />
                <input
                  type={showPass ? "text" : "password"}
                  value={form.confirmPassword}
                  onChange={(e) => set("confirmPassword", e.target.value)}
                  placeholder="Repite la contraseña"
                  required
                  autoComplete="new-password"
                  className={inputCls}
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-500 disabled:opacity-60 text-white text-sm font-semibold transition-colors duration-150 mt-2"
            >
              <UserPlus size={16} />
              {loading ? "Creando cuenta..." : "Crear cuenta de administrador"}
            </button>
          </form>
        </div>

        <p className="text-center text-xs dark:text-slate-600 text-slate-400 mt-6">
          ¿Ya tenés cuenta?{" "}
          <Link href="/login" className="dark:text-teal-400 text-teal-600 hover:underline font-medium">
            Iniciá sesión
          </Link>
        </p>
      </div>
    </div>
  );
}
