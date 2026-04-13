"use client";

import { Suspense, useState, useRef } from "react";
import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import Image from "next/image";
import { Mail, Lock, LogIn, Eye, EyeOff, ShieldCheck, ArrowLeft } from "lucide-react";

type LoginStep = "credentials" | "totp";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") ?? "/";

  const [step, setStep] = useState<LoginStep>("credentials");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [totpCode, setTotpCode] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const totpInputRef = useRef<HTMLInputElement>(null);

  // ── Paso 1: verifica credenciales y detecta si se necesita 2FA ────────────
  async function handleCredentialsSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/auth/check-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      if (res.status === 429) {
        setError("Demasiados intentos fallidos. Esperá unos minutos antes de reintentar.");
        return;
      }

      const data = await res.json() as { valid: boolean; totpRequired: boolean };

      if (!data.valid) {
        setError("Credenciales incorrectas. Verifica tu email y contraseña.");
        return;
      }

      if (data.totpRequired) {
        // Avanzar al paso 2FA sin crear sesión todavía
        setStep("totp");
        setTimeout(() => totpInputRef.current?.focus(), 100);
        return;
      }

      // No requiere 2FA — completar login con NextAuth
      await completarLogin("");
    } catch (err) {
      setError(`Error de conexion: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setLoading(false);
    }
  }

  // ── Paso 2: verifica código TOTP y completa el login ─────────────────────
  async function handleTotpSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (totpCode.length !== 6) {
      setError("El código debe tener exactamente 6 dígitos.");
      return;
    }
    setLoading(true);
    setError("");
    try {
      await completarLogin(totpCode);
    } finally {
      setLoading(false);
    }
  }

  async function completarLogin(code: string) {
    const result = await signIn("credentials", {
      email,
      password,
      totpCode: code,
      redirect: false,
    });

    if (result?.error) {
      if (step === "totp") {
        setError("Código 2FA incorrecto. Intentá nuevamente.");
        setTotpCode("");
        totpInputRef.current?.focus();
      } else {
        setError("Credenciales incorrectas. Verifica tu email y contraseña.");
      }
      return;
    }

    const dest = callbackUrl && callbackUrl.startsWith("/") ? callbackUrl : "/";
    router.push(dest);
    router.refresh();
  }

  function volverACredenciales() {
    setStep("credentials");
    setTotpCode("");
    setError("");
  }

  const inputCls =
    "w-full pl-10 pr-4 py-2.5 rounded-xl text-sm border dark:border-white/[0.08] border-slate-200 dark:bg-slate-800/60 bg-white dark:text-slate-100 text-slate-800 dark:placeholder:text-slate-600 placeholder:text-slate-300 focus:outline-none focus:ring-2 focus:ring-teal-500/40 transition-all";

  return (
    <div className="min-h-screen flex items-center justify-center dark:bg-slate-950 bg-slate-50 px-4">
      <div className="w-full max-w-sm">
        {/* Logo / Brand */}
        <div className="flex flex-col items-center mb-6">
          <Image
            src="/logo-tekoga.png"
            alt="TEKÓGA"
            width={314}
            height={127}
            className="object-contain mx-auto"
            priority
          />
          <p className="text-sm dark:text-slate-400 text-slate-500 -mt-5">
            Centro de Mando — Gestión de Obras
          </p>
        </div>

        {/* Card */}
        <div className="rounded-2xl border dark:border-white/[0.06] border-slate-200 dark:bg-slate-900/60 bg-white shadow-xl shadow-slate-200/50 dark:shadow-none p-8">

          {/* ── PASO 1: Credenciales ────────────────────────────────────── */}
          {step === "credentials" && (
            <>
              <h2 className="text-base font-semibold dark:text-slate-100 text-slate-800 mb-6">
                Iniciar sesión
              </h2>

              <form onSubmit={handleCredentialsSubmit} noValidate className="space-y-4">
                {/* Email */}
                <div>
                  <label className="block text-xs font-medium dark:text-slate-400 text-slate-500 mb-1.5">
                    Correo electrónico
                  </label>
                  <div className="relative">
                    <Mail size={15} className="absolute left-3 top-1/2 -translate-y-1/2 dark:text-slate-500 text-slate-400" />
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
                    <Lock size={15} className="absolute left-3 top-1/2 -translate-y-1/2 dark:text-slate-500 text-slate-400" />
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

                {error && (
                  <p className="text-xs text-red-500 dark:text-red-400 bg-red-50 dark:bg-red-950/20 px-3 py-2 rounded-lg">
                    {error}
                  </p>
                )}

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
                  {loading ? "Verificando..." : "Continuar"}
                </button>
              </form>
            </>
          )}

          {/* ── PASO 2: Código 2FA ──────────────────────────────────────── */}
          {step === "totp" && (
            <>
              <div className="flex items-center gap-2 mb-5">
                <button
                  onClick={volverACredenciales}
                  className="p-1 rounded-lg hover:dark:bg-slate-800 hover:bg-slate-100 transition-colors dark:text-slate-400 text-slate-500"
                  aria-label="Volver"
                >
                  <ArrowLeft size={15} />
                </button>
                <h2 className="text-base font-semibold dark:text-slate-100 text-slate-800">
                  Verificación en dos pasos
                </h2>
              </div>

              <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-teal-500/10 mb-4 mx-auto">
                <ShieldCheck size={20} className="text-teal-500" />
              </div>

              <p className="text-xs dark:text-slate-400 text-slate-500 text-center mb-5">
                Ingresá el código de 6 dígitos desde tu aplicación autenticadora
                (Google Authenticator, Authy, etc.)
              </p>

              <form onSubmit={handleTotpSubmit} noValidate className="space-y-4">
                <div>
                  <label className="block text-xs font-medium dark:text-slate-400 text-slate-500 mb-1.5">
                    Código de autenticación
                  </label>
                  <input
                    ref={totpInputRef}
                    type="text"
                    inputMode="numeric"
                    pattern="\d{6}"
                    maxLength={6}
                    value={totpCode}
                    onChange={(e) => setTotpCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                    placeholder="000000"
                    required
                    autoComplete="one-time-code"
                    className="w-full px-4 py-3 rounded-xl text-center text-2xl font-mono tracking-widest border dark:border-white/[0.08] border-slate-200 dark:bg-slate-800/60 bg-white dark:text-slate-100 text-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-500/40 transition-all"
                  />
                </div>

                {error && (
                  <p className="text-xs text-red-500 dark:text-red-400 bg-red-50 dark:bg-red-950/20 px-3 py-2 rounded-lg">
                    {error}
                  </p>
                )}

                <button
                  type="submit"
                  disabled={loading || totpCode.length !== 6}
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
            </>
          )}
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
