import { api } from "@/lib/api";
import type { LoginCredentials } from "@/types/auth";

export const authService = {
  context() {
    return api("/sesion");
  },
  login(credentials: LoginCredentials) {
    return api("/sesion", {
      method: "POST",
      body: JSON.stringify({ ...credentials, correo: credentials.correo.trim().toLowerCase() }),
    });
  },
  logout(csrfToken: string) {
    return api("/sesion", { method: "DELETE", headers: { "X-CSRF-Token": csrfToken } });
  },
};
