"use client";
import Link from "next/link";
import { useCallback, useState } from "react";
import { useConsulta } from "@/hooks/useConsulta";
import { manada } from "@/services/manadaService";
import { deviceIcon, Icon } from "@/components/ui/Icon";
import { Empty, ErrorNotice, Loading, Status, Sync } from "@/components/ui/Feedback";
import { IncidentTable } from "@/components/incidencias/IncidentTable";

export function Classrooms({ emaId, privada = false }: { emaId?: number; privada?: boolean }) {
  const [selectedEma, setSelectedEma] = useState(emaId || 0);
  const emas = useConsulta(useCallback(signal => manada.emas(signal), []), false);
  const currentEma = emaId || selectedEma || emas.data?.[0]?.id || 0;
  const consulta = useConsulta(useCallback(signal => currentEma ? manada.aulas(currentEma, signal) : Promise.resolve([]), [currentEma]));
  return <><div className="page-intro"><h1>Aulas</h1><p>Todos los espacios, tengan o no reportes activos.</p></div>{!privada && <div className="field"><label htmlFor="ema-publico">EMA</label><select id="ema-publico" value={currentEma} onChange={e => setSelectedEma(Number(e.target.value))}><option value="0" disabled>Selecciona un EMA</option>{emas.data?.map(e => <option key={e.id} value={e.id}>{e.nombre}</option>)}</select></div>}<ErrorNotice error={emas.error || consulta.error} retry={() => { void emas.reload(); void consulta.reload(); }} />{consulta.loading || emas.loading ? <Loading /> : <>{!consulta.data?.length ? <Empty title="No hay aulas registradas">Las aulas aparecerán cuando el equipo cargue el inventario.</Empty> : <div className="room-grid">{consulta.data.map(a => { const active = a.incidencias.pendientes + a.incidencias.vistas; return <Link className="room-card panel" key={a.id} href={`${privada ? "/admin" : ""}/aulas/${a.id}`}><div className="row between"><span className="room-icon"><Icon name="room" /></span><Status estado={a.incidencias.pendientes ? "PENDIENTE" : a.incidencias.vistas ? "VISTO" : "Sin reportes activos"} /></div><h2>Aula {a.numero}</h2><p>{a.ema.nombre}</p><div className="row between"><span className="help">{active} incidencias activas</span><Icon name="arrow" /></div></Link>; })}</div>}<Sync updated={consulta.updated} error={consulta.error} /></>}</>;
}

export function ClassroomDetail({ id, emaId, privada = false }: { id: number; emaId?: number; privada?: boolean }) {
  const consulta = useConsulta(useCallback(signal => manada.recursos(id, signal), [id]));
  const reports = useConsulta(useCallback(signal => manada.incidencias(privada, `?aulaId=${id}`, signal), [privada, id]));
  const [showReports, setShowReports] = useState(false);
  const room = consulta.data?.aula;
  if (consulta.loading) return <Loading />;
  if (room && privada && room.emaId !== emaId) return <Empty title="Esta aula está fuera de tu EMA">El alcance técnico externo se consulta desde Incidencias.</Empty>;
  return <><div className="breadcrumb"><Link href={privada ? "/admin/aulas" : "/aulas"}>Aulas</Link><Icon name="chevron" /><span>{room ? `Aula ${room.numero}` : "Detalle"}</span></div><ErrorNotice error={consulta.error} retry={consulta.reload} />{room && <><div className="page-intro"><h1>Aula {room.numero}</h1><p>{room.ema.nombre} · {consulta.data?.paginacion.total} dispositivos reportables registrados</p></div><div className="category-tabs" role="group" aria-label="Contenido del aula"><button className={`category-tab ${!showReports ? "active" : ""}`} aria-pressed={!showReports} onClick={() => setShowReports(false)}>Inventario y reportes activos</button><button className={`category-tab ${showReports ? "active" : ""}`} aria-pressed={showReports} onClick={() => setShowReports(true)}>Todas las incidencias</button></div>{showReports ? <section className="panel"><ErrorNotice error={reports.error} retry={reports.reload} />{reports.loading ? <Loading /> : reports.data?.length ? <IncidentTable rows={reports.data} privada={privada} /> : <Empty title="No hay incidencias registradas en esta aula" />}</section> : <section className="panel"><div className="section-top"><h2>Inventario y reportes</h2>{!privada && <Link href="/reportar">Reportar una falla <Icon name="arrow" /></Link>}</div>{consulta.data?.datos.length ? <div className="table-wrap"><table className="responsive-table"><caption className="sr-only">Dispositivos reportables del aula</caption><thead><tr><th>Dispositivo</th><th>Categoría</th><th>Reporte activo</th></tr></thead><tbody>{consulta.data.datos.map(d => <tr key={d.id}><td><strong><Icon name={deviceIcon(d.tipo.nombre)} /> <span className="mono">{d.clave}</span></strong></td><td className="secondary-cell">{d.tipo.nombre}</td><td className="status-cell">{d.incidenciaActiva ? <Link href={privada ? `/admin/incidencias/${d.incidenciaActiva.folio}` : `/seguimiento?folio=${d.incidenciaActiva.folio}`}><Status estado={d.incidenciaActiva.estado} /></Link> : <Status estado="Sin reporte activo" />}</td></tr>)}</tbody></table></div> : <Empty title="No hay dispositivos registrados" />}</section>}<Sync updated={showReports ? reports.updated : consulta.updated} error={showReports ? reports.error : consulta.error} /></>}</>;
}
