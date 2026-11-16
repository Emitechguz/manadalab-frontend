"use client";
import Link from "next/link";
import { useCallback, useRef, useState } from "react";
import { useConsulta } from "@/hooks/useConsulta";
import { useSession } from "@/providers/SessionProvider";
import { manada } from "@/services/manadaService";
import { ApiError } from "@/lib/api";
import {
  ErrorNotice,
  fecha,
  labels,
  Loading,
  Status,
  Sync
} from "@/components/ui/Feedback";
import { Icon } from "@/components/ui/Icon";

export function IncidentDetail({ id }: { id: string }) {
  const { session } = useSession();
  const consulta = useConsulta(
    useCallback(signal => manada.incidencia(id, true, signal), [id])
  );
  const [busy, setBusy] = useState(false);
  const saving = useRef(false);
  const [actionError, setActionError] = useState<unknown>();
  const [message, setMessage] = useState("");
  const r = consulta.data;
  const usuario = session!.usuario;
  const canManage =
    r &&
    (r.dispositivo.tipo.nombre === "Computadora"
      ? usuario.esTecnico
      : usuario.emaId === r.dispositivo.emaId);
  async function advance() {
    if (!r || !session || saving.current) return;
    saving.current = true;
    setBusy(true);
    setActionError(undefined);
    setMessage("");
    try {
      await manada.cambiarEstado(
        id,
        r.estado === "PENDIENTE" ? "VISTO" : "SOLUCIONADO",
        r.version,
        session.csrfToken
      );
      await consulta.reload();
      setMessage("Estado actualizado.");
    } catch (cause) {
      setActionError(cause);
      if (cause instanceof ApiError && cause.status === 409) {
        await consulta.reload();
        setMessage(
          "Cargamos la información actual. Revísala antes de volver a cambiar el estado."
        );
      }
    } finally {
      saving.current = false;
      setBusy(false);
    }
  }
  return <>
    <div className="breadcrumb">
      <Link href="/admin/incidencias">Incidencias</Link>
      <Icon name="chevron" />
      <span className="mono">{r?.folio || id}</span>
    </div>
    <ErrorNotice error={consulta.error} retry={consulta.reload} />
    {consulta.loading ?
      <Loading /> :
      r &&
      <>
        <div className="admin-title">
          <div>
            <h1>{r.dispositivo.clave}</h1>
            <p>
              {r.dispositivo.ema.nombre} · Aula {r.dispositivo.aula?.numero} · {r.dispositivo.tipo.nombre}
            </p>
          </div>
          <Status estado={r.estado} />
        </div>
        <ErrorNotice error={actionError} />
        {message &&
          <div className="notice" role="status">
            {message}
          </div>}
        <div className="detail-layout">
          <section className="panel panel-pad">
            <h2>Detalle de la incidencia</h2>
            <dl className="definition-grid">
              <div>
                <dt>Folio</dt>
                <dd className="mono">{r.folio}</dd>
              </div>
              <div>
                <dt>Clave del dispositivo</dt>
                <dd className="mono">{r.dispositivo.clave}</dd>
              </div>
              <div>
                <dt>Registrado</dt>
                <dd>{fecha(r.creadaEn, true)}</dd>
              </div>
              <div>
                <dt>Actualizado</dt>
                <dd>{fecha(r.actualizadaEn, true)}</dd>
              </div>
            </dl>
            <hr className="divider" />
            <h3>Descripción del problema</h3>
            <p className="private-description">{r.descripcion}</p>
            <div className="form-actions">
              {r.estado === "SOLUCIONADO" ?
                <span className="help">Reporte solucionado. No admite más cambios.</span> : canManage ?
                  <>
                    <span className="help">
                      {r.estado === "PENDIENTE"
                        ? "Confirma que revisaste el reporte."
                        : "Confirma que la falla fue atendida."}
                    </span>
                    <button
                      className="btn primary"
                      disabled={busy || !!consulta.error}
                      onClick={advance}
                    >
                      {busy
                        ? "Guardando…"
                        : r.estado === "PENDIENTE"
                          ? "Marcar como visto"
                          : "Marcar como solucionado"}
                      <Icon name="check" />
                    </button>
                  </> :
                  <div className="notice">Solo el personal con permiso técnico puede cambiar el estado de computadoras.</div>}
            </div>
          </section>
          <aside className="panel panel-pad">
            <h2>Historial interno</h2>
            <p className="help">Visible únicamente para personal autorizado.</p>
            <ol className="history">
              {r.historial
                .slice()
                .reverse()
                .map((h, i) =>
                  <li key={`${h.fecha}-${i}`}>
                    <div>
                      <strong>{labels[h.estadoNuevo]}</strong>
                      <small>{fecha(h.fecha, true)}</small>
                      <small>{h.usuario?.nombre || "Reporte público"}</small>
                    </div>
                  </li>
                )}
            </ol>
          </aside>
        </div>
      </>}
    <Sync updated={consulta.updated} error={consulta.error} />
  </>;
}
