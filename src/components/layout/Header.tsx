import Image from "next/image";
import { UserMenu } from "./UserMenu";
import { getSession } from "@/lib/session";

export async function Header() {
  const session = await getSession();
  const user = session?.user;
  const name = user?.name ?? "Usuario";
  const email = user?.email ?? "";
  const role = (user as { role?: string } | undefined)?.role ?? "USUARIO";

  return (
    <header className="sticky top-0 z-50 w-full backdrop-blur-md border-b dark:bg-slate-950/90 bg-white/90 dark:border-white/[0.06] border-slate-200 transition-colors duration-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between gap-3">
        {/* Logo */}
        <div className="flex items-center shrink-0">
          <Image
            src="/logo-tekoga.png"
            alt="tekÓGA — Innovación en Construcción"
            width={228}
            height={78}
            priority
            className="block object-contain h-25 w-auto"
          />
        </div>

        {/* Right side */}
        <div className="flex items-center gap-2 sm:gap-3">
          {user && <UserMenu name={name} email={email} role={role} />}
        </div>
      </div>
    </header>
  );
}

