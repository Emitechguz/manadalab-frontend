import { env } from "@/config/env";

export class ApiError extends Error {
  constructor(public readonly status: number, public readonly body: unknown) {
    super(isObject(body) && typeof body.mensaje === "string" ? body.mensaje : `La API respondió con el estado ${status}.`);
    this.name = "ApiError";
  }
}

// Las respuestas siguen siendo unknown hasta validar el contrato de cada servicio.
export async function api(path: string, options: RequestInit = {}): Promise<unknown> {
  const headers = new Headers(options.headers);
  headers.set("Accept", "application/json");
  if (options.body && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  const response = await fetch(`${env.apiBaseUrl}/${path.replace(/^\/+/, "")}`, {
    ...options,
    headers,
    credentials: "include",
    cache: "no-store",
  });

  if (response.status === 204) return undefined;
  const body: unknown = await response.json().catch(() => undefined);
  if (!response.ok) {
    if (response.status === 401 && path.replace(/^\/+/, "") !== "sesion" && typeof window !== "undefined") window.dispatchEvent(new Event("manadalab:session-expired"));
    throw new ApiError(response.status, body);
  }
  return body;
}

export function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

export function errorMessage(error: unknown) {
  return error instanceof ApiError ? error.message : "No pudimos conectar con el servidor. Conservamos tus datos; vuelve a intentarlo.";
}
