"use client";
import Link from "next/link";
import { useCallback, useRef, useState } from "react";
import { useSession } from "@/providers/SessionProvider";
import { useConsulta } from "@/hooks/useConsulta";
import { manada } from "@/services/manadaService";
import { ErrorNotice, fecha, Loading, Status, Sync } from "@/components/ui/Feedback";
import { Icon } from "@/components/ui/Icon";
import { Modal } from "@/components/ui/Modal";

export function LoanDetail({ id }: { id: string }) {
  const { session } = useSession();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const sending = useRef(false);
  const [error, setError] = useState<unknown>();
  const [message, setMessage] = useState("");
  const consulta = useConsulta(
    useCallback(signal => manada.prestamo(id, signal), [id])
  );
  const p = consulta.data;
  async function devolver() {
    if (sending.current || !session) return;
    sending.current = true;
    setBusy(true);
    setError(undefined);
    try {
      await manada.devolver(id, session.csrfToken);
      await consulta.reload();
      setOpen(false);
      setMessage("Devolución registrada. La unidad está disponible para otro préstamo.");
    } catch (cause) {
      setError(cause);
    } finally {
      sending.current = false;
      setBusy(false);
    }
  }
  return <>
    <div className="breadcrumb">
      <Link href="/admin/prestamos">Préstamos</Link>
      <Icon name="chevron" />
      <span>Registro #{id}</span>
    </div>
    <ErrorNotice error={consulta.error} retry={consulta.reload} />
    {consulta.loading ?
      <Loading /> :
      p &&
      <>
        <div className="admin-title">
          <div>
            <h1>{p.dispositivo.tipo.nombre}</h1>
            <p>Unidad {p.dispositivo.clave} · Registro #{p.id}
            </p>
          </div>
          <Status estado={p.fechaDevolucion ? "DEVUELTO" : "PENDIENTE"} />
        </div>
        {message &&
          <div className="notice" role="status">
            {message}
          </div>}
        <section className="panel panel-pad" style={{ maxWidth: 800 }}>
          <h2>Información del préstamo</h2>
          <dl className="definition-grid">
            <div>
              <dt>Profesor receptor</dt>
              <dd>{p.profesorNombre}</dd>
            </div>
            <div>
              <dt>Clave de la unidad</dt>
              <dd className="mono">{p.dispositivo.clave}</dd>
            </div>
            <div>
              <dt>Fecha del préstamo</dt>
              <dd>{fecha(p.fechaPrestamo, true)}</dd>
            </div>
            <div>
              <dt>Fecha de devolución</dt>
              <dd>{fecha(p.fechaDevolucion, true)}</dd>
            </div>
            <div>
              <dt>Registrado por</dt>
              <dd>{p.admin.nombre}</dd>
            </div>
            <div>
              <dt>Identificador interno</dt>
              <dd>#{p.id}</dd>
            </div>
          </dl>
          <div className="form-actions">
            {p.fechaDevolucion ?
              <span className="help">La devolución quedó registrada y se conserva este historial.</span> :
              <>
                <span className="help">Confirma la devolución cuando recibas físicamente esta unidad.</span>
                <button
                  className="btn primary"
                  disabled={!!consulta.error}
                  onClick={() => setOpen(true)}
                >Confirmar devolución <Icon name="check" />
                </button>
              </>}
          </div>
        </section>
        <Modal
          open={open}
          title="Confirmar devolución"
          busy={busy}
          onClose={() => {
            if (!busy) setOpen(false);
          }}
        >
          <p>Verifica la unidad antes de continuar.</p>
          <div className="selection-summary" style={{ gridTemplateColumns: "1fr" }}>
            <div>
              <small>Artículo</small>
              <strong>
                {p.dispositivo.tipo.nombre} · {p.dispositivo.clave}
              </strong>
            </div>
            <div>
              <small>Profesor receptor</small>
              <strong>{p.profesorNombre}</strong>
            </div>
          </div>
          <p className="help">La unidad quedará disponible para otro préstamo. El registro se conservará. Repetir esta confirmación conserva la fecha de devolución original.</p>
          <ErrorNotice error={error} />
          <div className="form-actions">
            <button className="btn" disabled={busy} onClick={() => setOpen(false)}>Cancelar</button>
            <button className="btn primary" disabled={busy} onClick={devolver}>
              {busy ? "Registrando…" : "Sí, recibí la unidad"}
            </button>
          </div>
        </Modal>
      </>}
    <Sync updated={consulta.updated} error={consulta.error} />
  </>;
}
