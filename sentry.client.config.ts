import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,

  // Solo habilitado cuando DSN está configurado
  enabled: !!process.env.NEXT_PUBLIC_SENTRY_DSN,

  // Tasa de muestreo de sesiones normales (10% en producción)
  tracesSampleRate: process.env.NODE_ENV === "production" ? 0.1 : 1.0,

  // No capturar errores en desarrollo para no ensuciar el panel
  environment: process.env.NODE_ENV ?? "development",

  // Replay solo en producción, 1% de sesiones / 100% de sesiones con error
  replaysSessionSampleRate: 0.01,
  replaysOnErrorSampleRate: 1.0,

  integrations: [
    Sentry.replayIntegration({
      // Ocultar texto e inputs para GDPR
      maskAllText: true,
      blockAllMedia: true,
    }),
  ],

  // Ignorar errores de red esperados
  ignoreErrors: [
    "TypeError: Failed to fetch",
    "TypeError: NetworkError",
    "AbortError",
  ],
});
