"use client";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { useConsulta } from "@/hooks/useConsulta";
import { ApiError, isObject } from "@/lib/api";
import { manada } from "@/services/manadaService";
import { deviceIcon, Icon } from "@/components/ui/Icon";
import { Empty, ErrorNotice, Loading, Status, Sync } from "@/components/ui/Feedback";
import type { Alta } from "@/types/domain";

type ReportBody = { dispositivoId: number; matricula: string; descripcion: string };
type Intencion = { key: string; body: ReportBody };
type Draft = { emaId: number; aulaId: number; dispositivoId: number; matricula: string; descripcion: string; step: number; intencion: Intencion | null };
const emptyDraft: Draft = { emaId: 0, aulaId: 0, dispositivoId: 0, matricula: "", descripcion: "", step: 1, intencion: null };
const storageKey = "manadalab.reportDraft.v2";
function restore(): Draft {
  try {
    const value: unknown = JSON.parse(sessionStorage.getItem(storageKey) || "null");
    if (!isObject(value)) return emptyDraft;
    const result = { ...emptyDraft };
    if (typeof value.emaId === "number") result.emaId = value.emaId;
    if (typeof value.aulaId === "number") result.aulaId = value.aulaId;
    if (typeof value.dispositivoId === "number") result.dispositivoId = value.dispositivoId;
    if (typeof value.matricula === "string") result.matricula = value.matricula;
    if (typeof value.descripcion === "string") result.descripcion = value.descripcion;
    if (value.step === 2) result.step = 2;
    const intention = value.intencion;
    if (isObject(intention) && typeof intention.key === "string" && isObject(intention.body) && typeof intention.body.dispositivoId === "number" && typeof intention.body.matricula === "string" && typeof intention.body.descripcion === "string") {
      result.intencion = intention as Intencion; result.step = 2;
    }
    return result;
  } catch { return emptyDraft; }
}

export function ReportForm() {
  const router = useRouter();
  const [draft, setDraft] = useState<Draft>(emptyDraft);
  const [ready, setReady] = useState(false);
  const [category, setCategory] = useState("pc");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<unknown>();
  const [storageWarning, setStorageWarning] = useState(false);
  const [validation, setValidation] = useState("");
  const sending = useRef(false);
  useEffect(() => { const timer = setTimeout(() => { setDraft(restore()); setReady(true); }, 0); return () => clearTimeout(timer); }, []);
  useEffect(() => { if (ready) { try { sessionStorage.setItem(storageKey, JSON.stringify(draft)); } catch { /* El borrador sigue disponible en memoria. */ } } }, [draft, ready]);
  const emas = useConsulta(useCallback(signal => manada.emas(signal), []), false);
  const emaId = draft.emaId || emas.data?.[0]?.id || 0;
  const aulas = useConsulta(useCallback(signal => emaId ? manada.aulas(emaId, signal) : Promise.resolve([]), [emaId]), false);
  const recursos = useConsulta(useCallback(signal => draft.aulaId ? manada.recursos(draft.aulaId, signal) : Promise.resolve(null), [draft.aulaId]));
  const aula = aulas.data?.find(a => a.id === draft.aulaId);
  const device = recursos.data?.datos.find(d => d.id === draft.dispositivoId);
  // El inventario determina la pestaña del dispositivo restaurado, incluso con borradores anteriores.
  const selectedCategory = device ? (device.tipo.nombre === "Computadora" ? "pc" : "more") : category;
  const locked = busy || !!draft.intencion;
  function change(update: Partial<Draft>) { if (!locked) { setDraft(d => ({ ...d, ...update })); setValidation(""); setError(undefined); } }
  async function submit(event: FormEvent) {
    event.preventDefault(); if (sending.current) return;
    const body = { dispositivoId: draft.dispositivoId, matricula: draft.matricula.trim(), descripcion: draft.descripcion.trim() };
    if (!draft.intencion && (!body.dispositivoId || !body.matricula || body.matricula.length > 32 || body.descripcion.length < 5 || body.descripcion.length > 2000)) { setValidation("Revisa el dispositivo, la matrícula (1–32 caracteres) y la descripción (5–2000 caracteres)."); return; }
    const intencion = draft.intencion || { key: crypto.randomUUID(), body };
    const pendingDraft = { ...draft, emaId, intencion };
    setDraft(pendingDraft); setBusy(true); sending.current = true; setError(undefined);
    // Guardar la intención antes de iniciar la petición permite recuperarla tras recargar.
    try { sessionStorage.setItem(storageKey, JSON.stringify(pendingDraft)); } catch { setStorageWarning(true); }
    function complete(alta: Alta, existing = false) {
      try { sessionStorage.removeItem(storageKey); } catch { /* No impide consultar el folio. */ }
      router.push(`${existing ? "/seguimiento" : "/confirmacion"}?folio=${encodeURIComponent(alta.incidencia.folio)}${existing ? "&existente=1" : ""}`);
    }
    try { complete(await manada.reportar(intencion.body, intencion.key)); }
    catch (cause) {
      if (cause instanceof ApiError && cause.status === 409 && isObject(cause.body) && isObject(cause.body.incidencia) && typeof cause.body.incidencia.folio === "string") { complete(cause.body as Alta, true); return; }
      setError(cause);
      // Un fallo de red/5xx no demuestra que no se haya confirmado: conservar cuerpo y clave.
      if (cause instanceof ApiError && cause.status < 500) setDraft(d => ({ ...d, intencion: null }));
      setBusy(false); sending.current = false;
    }
  }
  if (!ready) return <Loading />;
  const rows = recursos.data?.datos || [];
  const visibleRows = rows.filter(d => selectedCategory === "pc" ? d.tipo.nombre === "Computadora" : d.tipo.nombre !== "Computadora");
  return <div className={`public-main ${draft.step === 2 ? "narrow" : ""}`}><div className="breadcrumb"><Link href="/">Inicio</Link><Icon name="chevron" /><span>Reportar problema</span></div><div className="page-intro"><h1>Cuéntanos qué está fallando.</h1><p>Tu reporte nos ayuda a cuidar las aulas y los equipos de CU2.</p></div><ol className="stepper" aria-label="Progreso">{["Ubicación y dispositivo", "Descripción y matrícula", "Confirmación"].map((title, i) => <li className={`stepper-item ${draft.step === i + 1 ? "current" : ""}`} aria-current={draft.step === i + 1 ? "step" : undefined} key={title}><span className="step-num">{i + 1}</span><span>{title}</span></li>)}</ol>
    {draft.step === 1 ? <><section className="panel"><div className="location-bar"><Icon name="room" /><strong>{emas.data?.find(e => e.id === emaId)?.nombre || "Selecciona un EMA"}</strong><Icon name="chevron" /><span>{aula ? `Aula ${aula.numero}` : "Selecciona tu aula"}</span></div><div className="location-select"><div className="field"><label htmlFor="ema">EMA</label><select id="ema" value={emaId} onChange={e => change({ emaId: Number(e.target.value), aulaId: 0, dispositivoId: 0 })}><option value="0" disabled>Selecciona un EMA</option>{emas.data?.map(e => <option key={e.id} value={e.id}>{e.nombre}</option>)}</select></div><div className="field"><label htmlFor="aula">¿En qué aula estás?</label><select id="aula" value={draft.aulaId} disabled={!aulas.data?.length} onChange={e => change({ emaId, aulaId: Number(e.target.value), dispositivoId: 0 })}><option value="0">Selecciona el aula</option>{aulas.data?.map(a => <option key={a.id} value={a.id}>Aula {a.numero}</option>)}</select></div></div></section><ErrorNotice error={emas.error || aulas.error} retry={() => { void emas.reload(); void aulas.reload(); }} />{emas.loading || aulas.loading ? <Loading /> : !emas.data?.length ? <Empty title="Todavía no hay EMAs registrados">El inventario será cargado por el equipo.</Empty> : !aulas.data?.length ? <Empty title="No hay aulas registradas en este EMA" /> : null}
      {!draft.aulaId ? <Empty title="Primero, elige tu aula">Después podrás seleccionar un dispositivo por su clave.</Empty> : <><div className="category-tabs" role="group" aria-label="Categoría de dispositivos">{[["pc", "Computadoras", "pc"], ["more", "Más dispositivos", "tv"]].map(([key, label, icon]) => <button key={key} className={`category-tab ${selectedCategory === key ? "active" : ""}`} aria-pressed={selectedCategory === key} onClick={() => { setCategory(key); change({ dispositivoId: 0 }); }}><Icon name={icon} /><strong>{label}</strong></button>)}</div><ErrorNotice error={recursos.error} retry={recursos.reload} />{recursos.loading ? <Loading /> : <><div className="device-grid">{visibleRows.map(d => <button type="button" className={`device-card ${device?.id === d.id ? "selected" : ""}`} key={d.id} aria-pressed={device?.id === d.id} onClick={() => change({ dispositivoId: d.id })}><span className="selection-dot" /><Icon name={deviceIcon(d.tipo.nombre)} /><strong>{d.clave}</strong><small>{d.tipo.nombre}</small><Status estado={d.incidenciaActiva?.estado || "Sin reporte activo"} /></button>)}</div>{!visibleRows.length && <Empty title="No hay dispositivos registrados en esta categoría">Solo se muestran las unidades del inventario real.</Empty>}{device?.incidenciaActiva && <div className="notice"><strong>Este dispositivo ya tiene un reporte activo</strong><p>No es necesario generar otro.</p><Link className="text-link" href={`/seguimiento?folio=${device.incidenciaActiva.folio}`}>Consultar estado <Icon name="arrow" /></Link></div>}<div className="form-actions"><span className="help">Verifica que la clave coincida con la etiqueta del dispositivo.</span><button className="btn primary" disabled={!device || !!device.incidenciaActiva || !!recursos.error} onClick={() => { change({ emaId, step: 2 }); window.scrollTo({ top: 0 }); }}>Continuar <Icon name="arrow" /></button></div><Sync updated={recursos.updated} error={recursos.error} /></>}</>}
    </> : <section className="panel panel-pad"><div className="selection-summary"><div><small>EMA</small><strong>{emas.data?.find(e => e.id === emaId)?.nombre || "—"}</strong></div><div><small>Aula</small><strong>{aula?.numero || recursos.data?.aula.numero || "—"}</strong></div><div><small>Dispositivo</small><strong>{device?.clave || `#${draft.dispositivoId}`}</strong></div></div><form onSubmit={submit} aria-busy={busy}><div className="field"><label htmlFor="matricula">Matrícula</label><input id="matricula" name="matricula" autoComplete="off" value={draft.matricula} maxLength={32} required readOnly={locked} onChange={e => change({ matricula: e.target.value })} aria-describedby="matricula-help" /><small id="matricula-help">Matrícula declarada, de 1 a 32 caracteres. No se muestra públicamente. El servidor valida el formato configurado.</small></div><div className="field"><label htmlFor="descripcion">Describe el problema</label><textarea id="descripcion" name="descripcion" value={draft.descripcion} minLength={5} maxLength={2000} required readOnly={locked} onChange={e => change({ descripcion: e.target.value })} placeholder="Explica qué falla y qué ocurre al utilizar el dispositivo." aria-describedby="description-count" /><small id="description-count">{draft.descripcion.length} / 2000 · Mínimo 5 caracteres.</small></div>{validation && <p role="alert" className="error-text">{validation}</p>}<ErrorNotice error={error} />{draft.intencion && !busy && <div className="notice">Aún no conocemos el resultado del envío. Reintenta para recuperar la misma operación y el mismo folio; el contenido se mantiene intacto.</div>}{storageWarning && <p className="help" role="status">El almacenamiento de esta pestaña no está disponible. Mantén esta página abierta hasta confirmar el resultado.</p>}<div className="form-actions"><button type="button" className="btn ghost" disabled={locked} onClick={() => change({ step: 1 })}><Icon name="back" />Cambiar dispositivo</button><button type="submit" className="btn primary" disabled={busy}>{busy ? "Enviando reporte…" : draft.intencion ? "Reintentar el mismo envío" : "Enviar reporte"}<Icon name="arrow" /></button></div><p className="help">Guarda el folio al terminar para consultar el estado de tu reporte.</p></form></section>}
  </div>;
}
