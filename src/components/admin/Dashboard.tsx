"use client";
import Link from "next/link";
import { useCallback } from "react";
import { useSession } from "@/providers/SessionProvider";
import { useConsulta } from "@/hooks/useConsulta";
import { manada } from "@/services/manadaService";
import { Empty, ErrorNotice, Loading, Sync } from "@/components/ui/Feedback";
import { Icon } from "@/components/ui/Icon";
import { IncidentTable } from "@/components/incidencias/IncidentTable";

export function Dashboard() {
  const { session } = useSession();
  const emaId = session?.usuario.emaId;
  const consulta = useConsulta(useCallback(async signal => {
    const [incidencias, aulas, prestamos] = await Promise.all([manada.incidencias(true, `?emaId=${emaId}`, signal), manada.aulas(emaId, signal), manada.prestamos(signal)]);
    return { incidencias, aulas, prestamos };
  }, [emaId]));
  const data = consulta.data;
  const active = data?.incidencias.filter(r => r.estado !== "SOLUCIONADO") || [];
  return <><div className="admin-title"><div><h1>Cada reporte cuenta.</h1><p>Esto es lo que sucede en tu EMA. Prioriza, atiende y da seguimiento.</p></div></div><ErrorNotice error={consulta.error} retry={consulta.reload} />{consulta.loading ? <Loading /> : data && <><div className="stats">{[["PENDIENTE","Pendientes","clock","Por revisar"],["VISTO","Vistas","eye","En seguimiento"],["SOLUCIONADO","Solucionadas","check","Atendidas en este EMA"]].map(([estado, title, icon, subtitle]) => <article className="stat panel" key={estado}><div className="stat-top"><span>{title}</span><Icon name={icon} /></div><div className="number">{String(data.incidencias.filter(r => r.estado === estado).length).padStart(2,"0")}</div><small>{subtitle}</small></article>)}</div><div className="dashboard-columns"><section className="panel"><div className="section-top"><div><h2>Incidencias por atender</h2><small>{active.length} reportes pendientes o vistos</small></div><Link href="/admin/incidencias">Ver todas <Icon name="chevron" /></Link></div>{active.length ? <IncidentTable rows={active.slice(0,5)} /> : <Empty title="Todo al día">No hay incidencias activas en este EMA.</Empty>}</section><aside><section className="panel"><div className="section-top"><div><h2>Aulas con reportes</h2><small>{data.aulas.filter(a => a.incidencias.pendientes + a.incidencias.vistas > 0).length} de {data.aulas.length} aulas con incidencias activas</small></div></div><div className="summary-list">{data.aulas.map(a => <Link className="room-line cell-link" href={`/admin/aulas/${a.id}`} key={a.id}><div><strong>Aula {a.numero}</strong><small>{a.incidencias.pendientes + a.incidencias.vistas ? "Incidencias activas" : "Sin reportes activos"}</small></div><span className="count-badge">{a.incidencias.pendientes + a.incidencias.vistas}</span></Link>)}{!data.aulas.length && <p className="help">No hay aulas registradas.</p>}</div></section><section className="panel" style={{ marginTop: 20 }}><div className="section-top"><div><h2>Préstamos presenciales</h2><small>Registro independiente de incidencias</small></div><Icon name="loans" /></div><div className="panel-pad"><div className="row between"><span>Por devolver</span><strong>{data.prestamos.filter(p => !p.fechaDevolucion).length}</strong></div><Link className="text-link" href="/admin/prestamos">Gestionar préstamos <Icon name="arrow" /></Link></div></section></aside></div><div className="quick-actions"><Link className="quick-action panel" href="/admin/incidencias?estado=PENDIENTE"><Icon name="report" /><span><strong>Revisar incidencias pendientes</strong><small>Comienza por los reportes sin revisar.</small></span><Icon name="arrow" /></Link><Link className="quick-action panel" href="/admin/prestamos/nuevo"><Icon name="plus" /><span><strong>Registrar una entrega</strong><small>Antenas y controles de tu EMA.</small></span><Icon name="arrow" /></Link></div><p className="admin-note">Los indicadores corresponden exclusivamente al EMA de tu cuenta.</p></>}<Sync updated={consulta.updated} error={consulta.error} /></>;
}
