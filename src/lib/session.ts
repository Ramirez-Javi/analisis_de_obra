/**
 * Wrapper de auth() con React cache().
 * Garantiza que en un mismo request del servidor, sin importar cuántos
 * Server Components llamen a getSession(), la lectura del JWT ocurre UNA sola vez.
 */
import { cache } from "react";
import { auth } from "@/lib/auth";

export const getSession = cache(auth);
