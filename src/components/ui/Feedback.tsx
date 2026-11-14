"use client";
import { useState } from "react";
import { ApiError, errorMessage, isObject } from "@/lib/api";
import { Icon } from "./Icon";
export const labels: Record<string, string> = { PENDIENTE: "Pendiente", VISTO: "Visto", SOLUCIONADO: "Solucionado", DEVUELTO: "Devuelto" };
export function Status({ estado }: { estado: string }) { return <span className={`pill ${estado === "PENDIENTE" ? "pending" : estado === "VISTO" ? "seen" : ["SOLUCIONADO", "DEVUELTO"].includes(estado) ? "done" : ""}`}>{labels[estado] || estado}</span>; }
export function fecha(value?: string | Date | null, full = false) { return value ? new Intl.DateTimeFormat("es-MX", { day: "2-digit", month: "short", year: "numeric", ...(full ? { hour: "2-digit", minute: "2-digit" } : {}) }).format(new Date(value)) : "—"; }
export function Empty({ title = "No hay resultados", children }: { title?: string; children?: React.ReactNode }) { return <div className="empty"><Icon name="search" /><h3>{title}</h3><p>{children || "Prueba con otros filtros o limpia tu búsqueda."}</p></div>; }
export function Loading() { return <div role="status" className="loading"><span className="skeleton" /><span className="skeleton short" /><span className="sr-only">Cargando datos…</span></div>; }
export function ErrorNotice({ error, retry }: { error: unknown; retry?: () => void }) {
  if (!error) return null;
  const body = error instanceof ApiError && isObject(error.body) ? error.body : undefined;
  const fields = Array.isArray(body?.errores) ? body.errores.filter(isObject) : [];
  return (
    <div className="notice error" role="alert">
      <strong>{error instanceof ApiError && error.status === 401 ? "La sesión ha vencido. Vuelve a iniciar sesión para continuar." : errorMessage(error)}</strong>
      {fields.length > 0 && <ul>{fields.map((field, index) => <li key={index}>{typeof field.campo === "string" ? `${field.campo}: ` : ""}{typeof field.mensaje === "string" ? field.mensaje : "Revisa este campo."}</li>)}</ul>}
      {typeof body?.idError === "string" && <small>Referencia del error: {body.idError}</small>}
      {retry && <button className="btn small" onClick={retry}>Reintentar <Icon name="refresh" /></button>}
    </div>
  );
}
export function Sync({ updated, error }: { updated?: Date; error?: unknown }) { return <p className={`sync ${error ? "stale" : ""}`} role="status">{error ? "Sin actualizar · " : "Actualizado "}{updated ? fecha(updated, true) : "Esperando al servidor"}</p>; }
export function Pagination({ page, total, onChange, size = 8 }: { page: number; total: number; onChange: (page: number) => void; size?: number }) {
  const pages = Math.max(1, Math.ceil(total / size));
  const current = Math.min(page, pages);
  return <nav className="pagination" aria-label="Paginación"><span>{total ? `${(current - 1) * size + 1}–${Math.min(current * size, total)}` : "0"} de {total} registros</span><div className="row"><button className="btn small" aria-label="Página anterior" disabled={current <= 1} onClick={() => onChange(current - 1)}><Icon name="back" /></button><span>{current} / {pages}</span><button className="btn small" aria-label="Página siguiente" disabled={current >= pages} onClick={() => onChange(current + 1)}><Icon name="arrow" /></button></div></nav>;
}
export function CopyFolio({ folio }: { folio: string }) {
  const [message, setMessage] = useState("");
  return <div className="folio-block"><span className="eyebrow">Folio del reporte</span><strong className="mono">{folio}</strong><button className="btn small" onClick={async () => { try { await navigator.clipboard.writeText(folio); setMessage("Folio copiado"); } catch { setMessage("Selecciona el folio completo para copiarlo."); } }}><Icon name="copy" />Copiar folio</button><span className="copy-message" role="status">{message}</span></div>;
}
