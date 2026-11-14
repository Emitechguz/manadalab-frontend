"use client";
import { useCallback, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useSession } from "@/providers/SessionProvider";
import { useConsulta } from "@/hooks/useConsulta";
import { manada } from "@/services/manadaService";
import { Empty, ErrorNotice, labels, Loading, Pagination, Sync } from "@/components/ui/Feedback";
import { Icon } from "@/components/ui/Icon";
import { IncidentTable } from "./IncidentTable";

export function Incidents() {
  const { session } = useSession();
  const params = useSearchParams();
  const [scope, setScope] = useState("own");
  const [query, setQuery] = useState("");
  const [room, setRoom] = useState(params.get("aula") || "");
  const [estado, setEstado] = useState(params.get("estado") || "");
  const [tipo, setTipo] = useState("");
  const [ema, setEma] = useState("");
  const [page, setPage] = useState(1);
  const consulta = useConsulta(useCallback(signal => manada.incidencias(true, "", signal), []));
  const usuario = session!.usuario;
  const rows = (consulta.data || []).filter(r => scope === "own" ? r.dispositivo.emaId === usuario.emaId : usuario.esTecnico && r.dispositivo.emaId !== usuario.emaId && r.dispositivo.tipo.nombre === "Computadora");
  const emas = [...new Map(rows.map(r => [r.dispositivo.emaId, r.dispositivo.ema.nombre])).entries()];
  const rooms = [...new Map(rows.filter(r => !ema || String(r.dispositivo.emaId) === ema).map(r => [r.dispositivo.aulaId, { numero: r.dispositivo.aula?.numero, ema: r.dispositivo.ema.nombre }])).entries()].filter(([id]) => id !== null);
  const tipos = [...new Map(rows.map(r => [r.dispositivo.tipo.id, r.dispositivo.tipo.nombre])).entries()];
  const filtered = rows.filter(r => (!room || String(r.dispositivo.aulaId) === room) && (!ema || String(r.dispositivo.emaId) === ema) && (!estado || r.estado === estado) && (!tipo || String(r.dispositivo.tipo.id) === tipo) && `${r.folio} ${r.dispositivo.clave}`.toLocaleLowerCase("es").includes(query.trim().toLocaleLowerCase("es")));
  const currentPage = Math.min(page, Math.max(1, Math.ceil(filtered.length / 8)));
  const clear = () => { setQuery(""); setRoom(""); setEstado(""); setTipo(""); setEma(""); setPage(1); };
  return <><div className="admin-title"><div><h1>Incidencias</h1><p>Consulta las fallas reportadas y da seguimiento a su atención.</p></div></div>{usuario.esTecnico && <div className="row wrap" role="group" aria-label="Alcance de incidencias"><button className={`btn ${scope === "own" ? "primary" : ""}`} aria-pressed={scope === "own"} onClick={() => { setScope("own"); clear(); }}>Mi EMA</button><button className={`btn ${scope === "external" ? "primary" : ""}`} aria-pressed={scope === "external"} onClick={() => { setScope("external"); clear(); }}>Computadoras de otros EMAs</button></div>}{scope === "external" && <div className="notice">Alcance técnico: puedes consultar y gestionar únicamente computadoras de otros EMAs.</div>}<div className="filters"><div className="search-field"><Icon name="search" /><input aria-label="Buscar por folio o dispositivo" placeholder="Buscar por folio o dispositivo" value={query} onChange={e => { setQuery(e.target.value); setPage(1); }} /></div>{scope === "external" && <select aria-label="Filtrar por EMA" value={ema} onChange={e => { setEma(e.target.value); setRoom(""); setPage(1); }}><option value="">Todos los EMAs</option>{emas.map(([id, nombre]) => <option key={id} value={id}>{nombre}</option>)}</select>}<select aria-label="Filtrar por aula" value={room} onChange={e => { setRoom(e.target.value); setPage(1); }}><option value="">Todas las aulas</option>{rooms.map(([id, a]) => <option key={id} value={id!}>Aula {a.numero}{scope === "external" ? ` · ${a.ema}` : ""}</option>)}</select><select aria-label="Filtrar por categoría" value={tipo} disabled={scope === "external"} onChange={e => { setTipo(e.target.value); setPage(1); }}><option value="">{scope === "external" ? "Computadoras" : "Todas las categorías"}</option>{tipos.map(([id,nombre]) => <option key={id} value={id}>{nombre}</option>)}</select><select aria-label="Filtrar por estado" value={estado} onChange={e => { setEstado(e.target.value); setPage(1); }}><option value="">Todos los estados</option>{["PENDIENTE","VISTO","SOLUCIONADO"].map(s => <option key={s} value={s}>{labels[s]}</option>)}</select><button className="btn ghost" onClick={clear}>Limpiar</button></div><ErrorNotice error={consulta.error} retry={consulta.reload} />{consulta.loading ? <Loading /> : <section className="panel">{filtered.length ? <IncidentTable rows={filtered.slice((currentPage-1)*8,currentPage*8)} /> : <Empty title={rows.length ? "No hay resultados" : "No hay incidencias en este alcance"} />}<Pagination page={currentPage} total={filtered.length} onChange={setPage} /></section>}<Sync updated={consulta.updated} error={consulta.error} /></>;
}
