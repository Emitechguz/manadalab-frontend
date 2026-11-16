"use client";
import Link from "next/link";
import { useCallback, useState } from "react";
import { useConsulta } from "@/hooks/useConsulta";
import { manada } from "@/services/manadaService";
import {
  Empty,
  ErrorNotice,
  fecha,
  Loading,
  Pagination,
  Status,
  Sync
} from "@/components/ui/Feedback";
import { Icon } from "@/components/ui/Icon";

export function Loans() {
  const consulta = useConsulta(useCallback(signal => manada.prestamos(signal), []));
  const [tipo, setTipo] = useState("");
  const [estado, setEstado] = useState("");
  const [page, setPage] = useState(1);
  const rows = consulta.data || [];
  const filtered = rows.filter(p =>
    (!tipo || p.dispositivo.tipo.nombre === tipo) &&
    (!estado || (p.fechaDevolucion ? "DEVUELTO" : "PENDIENTE") === estado)
  );
  const current = Math.min(page, Math.max(1, Math.ceil(filtered.length / 8)));
  return <>
    <div className="admin-title">
      <div>
        <h1>Préstamos</h1>
        <p>Entregas presenciales y devoluciones de artículos de tu EMA.</p>
      </div>
      <Link className="btn primary" href="/admin/prestamos/nuevo">
        <Icon name="plus" />Registrar entrega</Link>
    </div>
    <ErrorNotice error={consulta.error} retry={consulta.reload} />
    {consulta.loading ?
      <Loading /> :
      <>
        <div className="loan-stats">
          <span>
            <strong>{rows.filter(p => !p.fechaDevolucion).length}</strong> pendientes de devolución</span>
          <span>
            <strong>{rows.filter(p => p.fechaDevolucion).length}</strong> devueltos</span>
        </div>
        <div className="filters">
          <select
            aria-label="Filtrar por artículo"
            value={tipo}
            onChange={e => {
              setTipo(e.target.value);
              setPage(1);
            }}
          >
            <option value="">Todos los artículos</option>
            {[...new Set(rows.map(p => p.dispositivo.tipo.nombre))].map(n =>
              <option key={n}>{n}</option>)}
          </select>
          <select
            aria-label="Filtrar por situación"
            value={estado}
            onChange={e => {
              setEstado(e.target.value);
              setPage(1);
            }}
          >
            <option value="">Todas las situaciones</option>
            <option value="PENDIENTE">Pendiente</option>
            <option value="DEVUELTO">Devuelto</option>
          </select>
          <button
            className="btn ghost"
            onClick={() => {
              setTipo("");
              setEstado("");
              setPage(1);
            }}
          >Limpiar</button>
        </div>
        <section className="panel">
          {filtered.length ?
            <div className="table-wrap">
              <table className="responsive-table">
                <caption className="sr-only">Préstamos de tu EMA</caption>
                <thead>
                  <tr>
                    <th>Artículo / Clave</th>
                    <th>Profesor receptor</th>
                    <th>Préstamo</th>
                    <th>Devolución</th>
                    <th>Situación</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.slice((current - 1) * 8, current * 8).map(p =>
                    <tr key={p.id}>
                      <td>
                        <Link className="cell-link" href={`/admin/prestamos/${p.id}`}>
                          <strong>{p.dispositivo.tipo.nombre}</strong>
                          <small className="mono">{p.dispositivo.clave}</small>
                        </Link>
                      </td>
                      <td className="secondary-cell">{p.profesorNombre}</td>
                      <td className="secondary-cell">{fecha(p.fechaPrestamo)}</td>
                      <td className="hide-mobile">{fecha(p.fechaDevolucion)}</td>
                      <td className="status-cell">
                        <Status estado={p.fechaDevolucion ? "DEVUELTO" : "PENDIENTE"} />
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div> :
            <Empty
              title={rows.length ? "No hay resultados" : "No hay préstamos registrados"}
            />}
          <Pagination page={current} total={filtered.length} onChange={setPage} />
        </section>
      </>}
    <Sync updated={consulta.updated} error={consulta.error} />
  </>;
}
