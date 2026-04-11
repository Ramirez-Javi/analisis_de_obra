"use client";

import { Suspense, useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { Building2, Mail, Lock, LogIn, Eye, EyeOff } from "lucide-react";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") ?? "/";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    const result = await signIn("credentials", {
      email,
      password,
      redirect: false,
    });

    setLoading(false);

    if (result?.error) {
      setError("Credenciales incorrectas. Verifica tu email y contraseña.");
      return;
    }

    router.push(callbackUrl);
    router.refresh();
  }

  const inputCls =
    "w-full pl-10 pr-4 py-2.5 rounded-xl text-sm border dark:border-white/[0.08] border-slate-200 dark:bg-slate-800/60 bg-white dark:text-slate-100 text-slate-800 dark:placeholder:text-slate-600 placeholder:text-slate-300 focus:outline-none focus:ring-2 focus:ring-teal-500/40 transition-all";

  return (
    <div className="min-h-screen flex items-center justify-center dark:bg-slate-950 bg-slate-50 px-4">
      <div className="w-full max-w-sm">
        {/* Logo / Brand */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-br from-teal-500 to-cyan-600 shadow-lg shadow-teal-500/30 mb-4">
            <Building2 size={26} className="text-white" />
          </div>
          <h1 className="text-2xl font-bold dark:text-white text-slate-900">
            TEKÓGA
          </h1>
          <p className="text-sm dark:text-slate-400 text-slate-500 mt-1">
            Centro de Mando — Gestión de Obras
          </p>
        </div>

        {/* Card */}
        <div className="rounded-2xl border dark:border-white/[0.06] border-slate-200 dark:bg-slate-900/60 bg-white shadow-xl shadow-slate-200/50 dark:shadow-none p-8">
          <h2 className="text-base font-semibold dark:text-slate-100 text-slate-800 mb-6">
            Iniciar sesión
          </h2>

          <form onSubmit={handleSubmit} noValidate className="space-y-4">
            {/* Email */}
            <div>
              <label className="block text-xs font-medium dark:text-slate-400 text-slate-500 mb-1.5">
                Correo electrónico
              </label>
              <div className="relative">
                <Mail
                  size={15}
                  className="absolute left-3 top-1/2 -translate-y-1/2 dark:text-slate-500 text-slate-400"
                />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="usuario@empresa.com"
                  required
                  autoComplete="email"
                  className={inputCls}
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <label className="block text-xs font-medium dark:text-slate-400 text-slate-500 mb-1.5">
                Contraseña
              </label>
              <div className="relative">
                <Lock
                  size={15}
                  className="absolute left-3 top-1/2 -translate-y-1/2 dark:text-slate-500 text-slate-400"
                />
                <input
                  type={showPass ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  autoComplete="current-password"
                  className={inputCls}
                />
                <button
                  type="button"
                  onClick={() => setShowPass((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 dark:text-slate-500 text-slate-400 hover:dark:text-slate-300 hover:text-slate-600"
                >
                  {showPass ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
            </div>

            {/* Error */}
            {error && (
              <p className="text-xs text-red-500 dark:text-red-400 bg-red-50 dark:bg-red-950/20 px-3 py-2 rounded-lg">
                {error}
              </p>
            )}

            {/* Submit */}
            <button
              type="submit"
              disabled={loading || !email || !password}
              className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold
                         bg-gradient-to-r from-teal-500 to-cyan-600
                         hover:from-teal-400 hover:to-cyan-500
                         text-white shadow-lg shadow-teal-500/25
                         disabled:opacity-50 disabled:cursor-not-allowed
                         transition-all duration-200 mt-2"
            >
              <LogIn size={15} />
              {loading ? "Verificando..." : "Ingresar"}
            </button>
          </form>
        </div>

        <p className="text-center text-xs dark:text-slate-600 text-slate-400 mt-6">
          ¿Sin acceso? Contacta al administrador del sistema.
        </p>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}
