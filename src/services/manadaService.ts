import { api, isObject } from "@/lib/api";
import type {
  Alta,
  Aula,
  DetalleIncidencia,
  Ema,
  Incidencia,
  Pagina,
  Prestable,
  Prestamo,
  Recursos
} from "@/types/domain";

function object<T>(value: unknown): T {
  if (!isObject(value)) throw new Error("Respuesta del servidor no válida.");
  return value as T;
}

async function get<T>(path: string, signal?: AbortSignal) {
  return object<T>(await api(path, { signal }));
}

// Los filtros de texto/categoría del diseño se aplican al conjunto completo,
// nunca únicamente a la primera página de Express. No se presuponen IDs de catálogo.

export async function listarTodo<T>(path: string, signal?: AbortSignal): Promise<T[]> {
  const separator = path.includes("?") ? "&" : "?";
  const result: T[] = [];
  let pagina = 1;
  let totalPaginas = 1;
  do {
    const response = await get<Pagina<T>>(
      `${path}${separator}limite=100&pagina=${pagina}`,
      signal
    );
    if (
      !Array.isArray(response.datos) ||
      !isObject(response.paginacion) ||
      !Number.isInteger(response.paginacion.totalPaginas)
    )
      throw new Error("Paginación no válida.");
    result.push(...response.datos);
    totalPaginas = response.paginacion.totalPaginas;
    pagina++;
  } while (pagina <= totalPaginas);
  return result;
}

export const manada = {
  emas: (signal?: AbortSignal) => listarTodo<Ema>("/emas", signal),
  aulas: (emaId?: number, signal?: AbortSignal) =>
    listarTodo<Aula>(`/aulas${emaId ? `?emaId=${emaId}` : ""}`, signal),
  async recursos(id: number, signal?: AbortSignal) {
    const first = await get<Recursos>(`/aulas/${id}/recursos?limite=100`, signal);
    const datos = [...first.datos];
    for (let pagina = 2; pagina <= first.paginacion.totalPaginas; pagina++) {
      datos.push(
        ...(
          await get<Recursos>(`/aulas/${id}/recursos?limite=100&pagina=${pagina}`, signal)
        ).datos
      );
    }
    return { ...first, datos };
  },
  incidencias: (privadas = false, query = "", signal?: AbortSignal) =>
    listarTodo<Incidencia>(`${privadas ? "/admin" : ""}/incidencias${query}`, signal),
  incidencia: (id: string, privada = false, signal?: AbortSignal) =>
    get<DetalleIncidencia>(
      `${privada ? "/admin" : ""}/incidencias/${encodeURIComponent(id)}`,
      signal
    ),
  async reportar(
    body: { dispositivoId: number; matricula: string; descripcion: string },
    key: string
  ) {
    const value = await api("/incidencias", {
      method: "POST",
      headers: { "Idempotency-Key": key },
      body: JSON.stringify(body)
    });
    // Una respuesta incompleta no confirma el resultado: conservar cuerpo y clave.
    if (
      !isObject(value) ||
      !isObject(value.incidencia) ||
      typeof value.incidencia.folio !== "string" ||
      !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        value.incidencia.folio
      )
    ) {
      throw new Error("No se pudo confirmar el folio del reporte.");
    }
    return value as Alta;
  },
  cambiarEstado: (id: string, estado: string, version: number, csrf: string) =>
    api(`/incidencias/${encodeURIComponent(id)}/estado`, {
      method: "PATCH",
      headers: { "X-CSRF-Token": csrf },
      body: JSON.stringify({ estado, version })
    }),
  prestamos: (signal?: AbortSignal) => listarTodo<Prestamo>("/admin/prestamos", signal),
  prestamo: (id: string, signal?: AbortSignal) =>
    get<Prestamo>(`/admin/prestamos/${encodeURIComponent(id)}`, signal),
  disponibles: (signal?: AbortSignal) =>
    listarTodo<Prestable>("/admin/prestamos/dispositivos", signal),
  async prestar(dispositivoId: number, profesorNombre: string, csrf: string) {
    const value = await api("/admin/prestamos", {
      method: "POST",
      headers: { "X-CSRF-Token": csrf },
      body: JSON.stringify({ dispositivoId, profesorNombre })
    });
    // Sin identificador confirmado, mantener la conciliación y no repetir el POST.
    if (
      !isObject(value) ||
      typeof value.id !== "number" ||
      !Number.isSafeInteger(value.id) ||
      value.id <= 0
    ) {
      throw new Error("No se pudo confirmar el identificador del préstamo.");
    }
    return value as Prestamo;
  },
  devolver: (id: string, csrf: string) =>
    api(`/admin/prestamos/${encodeURIComponent(id)}/devolucion`, {
      method: "PATCH",
      headers: { "X-CSRF-Token": csrf },
      body: "{}"
    }),
};
