import type { Metadata } from "next";
import { Geist } from "next/font/google";
import { headers } from "next/headers";
import { Toaster } from "sonner";
import { ThemeProvider } from "@/components/providers/ThemeProvider";
import { AuthProvider } from "@/components/providers/AuthProvider";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "TEKÓGA — Centro de Mando",
  description: "ERP de gestión de presupuestos y control de obras de arquitectura",
  icons: {
    icon: "/favicon.svg",
  },
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const nonce = (await headers()).get("x-nonce") ?? "";

  return (
    <html
      lang="es"
      className={`${geistSans.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <body className="min-h-full flex flex-col">
        <ThemeProvider nonce={nonce}>
          <AuthProvider>
            {children}
          </AuthProvider>
          <Toaster
            position="bottom-right"
            theme="system"
            richColors
            closeButton
          />
          <footer className="border-t dark:border-white/[0.04] border-slate-200 py-4 px-6 text-center">
            <p className="text-xs dark:text-slate-500 text-slate-400 leading-relaxed">
              TEK&Oacute;GA &mdash; Innovaci&oacute;n en Construcci&oacute;n
            </p>
            <p className="text-[11px] dark:text-slate-600 text-slate-400 mt-0.5">
              TEK&Oacute;GA, un producto de{" "}
              <a
                href="https://www.tekoinnova.com"
                target="_blank"
                rel="noopener noreferrer"
                className="underline underline-offset-2 hover:dark:text-slate-400 hover:text-slate-500 transition-colors"
              >
                www.tekoinnova.com
              </a>
              {" "}&mdash; &copy; 2026 &mdash; Todos los derechos reservados
            </p>
          </footer>
        </ThemeProvider>
      </body>
    </html>
  );
}
