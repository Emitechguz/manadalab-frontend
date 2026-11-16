import type { ReactNode } from "react";
import { SessionProvider } from "./SessionProvider";

// Punto de composición para añadir los providers de tema y sesión al implementarlos.

export function AppProviders({ children }: { children: ReactNode }) {
  return <SessionProvider>{children}</SessionProvider>;
}
