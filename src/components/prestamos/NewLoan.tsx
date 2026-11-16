"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState, type FormEvent } from "react";
import { useSession } from "@/providers/SessionProvider";
import { useConsulta } from "@/hooks/useConsulta";
import { manada } from "@/services/manadaService";
import { ApiError, isObject } from "@/lib/api";
import { Empty, ErrorNotice, Loading, Sync } from "@/components/ui/Feedback";
import { Icon } from "@/components/ui/Icon";
import { Modal } from "@/components/ui/Modal";

type Draft = { teacher: string; device: number; pending: boolean };
const initial: Draft = { teacher: "", device: 0, pending: false };

export function NewLoan() {
  const { session } = useSession();
  const router = useRouter();
  const storageKey = `manadalab.loanDraft.v2.${session!.usuario.id}`;
  const consulta = useConsulta(useCallback(signal => manada.disponibles(signal), []));
  const [draft, setDraft] = useState(initial);
  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState(false);
  const sending = useRef(false);
  const [error, setError] = useState<unknown>();
  const [validation, setValidation] = useState("");
  const [found, setFound] = useState<number>();
  const [checked, setChecked] = useState(false);
  const [newIntent, setNewIntent] = useState(false);
  const [storageWarning, setStorageWarning] = useState(false);
  useEffect(() => {
    const timer = setTimeout(() => {
      try {
        const value: unknown = JSON.parse(sessionStorage.getItem(storageKey) || "null");
        if (
          isObject(value) &&
          typeof value.teacher === "string" &&
          typeof value.device === "number"
        )
          setDraft({
            teacher: value.teacher,
            device: value.device,
            pending: value.pending === true
          });
      } catch {
        /* Captura en memoria si no hay almacenamiento. */
      }
      setReady(true);
    }, 0);
    return () => clearTimeout(timer);
  }, [storageKey]);
  useEffect(() => {
    if (ready) {
      try {
        sessionStorage.setItem(storageKey, JSON.stringify(draft));
      } catch {
        /* La captura no depende del almacenamiento. */
      }
    }
  }, [draft, ready, storageKey]);
  async function checkResult() {
    if (sending.current) return;
    sending.current = true;
    setBusy(true);
    setError(undefined);
    try {
      const loans = await manada.prestamos();
      const loan = loans.find(p => p.dispositivo.id === draft.device && !p.fechaDevolucion
      );
      setFound(loan?.id);
      setChecked(true);
      await consulta.reload();
    } catch (cause) {
      setError(cause);
    } finally {
      sending.current = false;
      setBusy(false);
    }
  }
  async function submit(event: FormEvent) {
    event.preventDefault();
    if (sending.current || draft.pending || !session) return;
    if (
      !consulta.data?.some(d => d.id === draft.device) ||
      draft.teacher.trim().length < 2 ||
      draft.teacher.trim().length > 150
    ) {
      setValidation(
        "Selecciona una unidad disponible y escribe el nombre del profesor (2–150 caracteres)."
      );
      return;
    }
    sending.current = true;
    setBusy(true);
    setError(undefined);
    setValidation("");
    const pending = { ...draft, pending: true };
    setDraft(pending);
    try {
      sessionStorage.setItem(storageKey, JSON.stringify(pending));
    } catch {
      setStorageWarning(true);
    }
    try {
      const loan = await manada.prestar(
        draft.device,
        draft.teacher.trim(),
        session.csrfToken
      );
      try {
        sessionStorage.removeItem(storageKey);
      } catch {
        /* El resultado está confirmado. */
      }
      router.push(`/admin/prestamos/${loan.id}`);
    } catch (cause) {
      setError(cause);
      if (cause instanceof ApiError && cause.status < 500)
        setDraft(d => ({ ...d, pending: false }));
      if (cause instanceof ApiError && cause.status === 409) {
        setValidation(
          "La unidad ya no está disponible. Revisa los préstamos actuales antes de volver a registrar una entrega."
        );
        await consulta.reload();
      }
      setBusy(false);
      sending.current = false;
    }
  }
  const locked = busy || draft.pending;
  return <>
    <div className="breadcrumb">
      <Link href="/admin/prestamos">Préstamos</Link>
      <Icon name="chevron" />
      <span>Registrar entrega</span>
    </div>
    <div className="admin-title">
      <div>
        <h1>Registrar entrega</h1>
        <p>El préstamo se realiza presencialmente. Registra solo la unidad entregada.</p>
      </div>
    </div>
    <section className="panel panel-pad" style={{ maxWidth: 700 }}>
      <div className="notice">Solo se muestran unidades disponibles de tu EMA. La fecha y el responsable se registran automáticamente.</div>
      <ErrorNotice error={consulta.error} retry={consulta.reload} />
      {consulta.loading || !ready ?
        <Loading /> :
        <>
          {!consulta.data?.length && !draft.pending &&
            <Empty title="No hay unidades disponibles">Consulta los préstamos pendientes y registra las devoluciones recibidas.</Empty>}
          <form onSubmit={submit}>
            <div className="field">
              <label htmlFor="unidad">Unidad disponible</label>
              <select
                id="unidad"
                value={draft.device}
                disabled={locked}
                onChange={e =>
                  setDraft(d => ({ ...d, device: Number(e.target.value) }))
                }
                required
              >
                <option value="0">Selecciona el artículo y su clave</option>
                {draft.device && !consulta.data?.some(d => d.id === draft.device) ?
                  <option value={draft.device}>Unidad #{draft.device} · disponibilidad por verificar</option> : null}
                {consulta.data?.map(d =>
                  <option key={d.id} value={d.id}>
                    {d.tipo.nombre} · {d.clave}
                  </option>)}
              </select>
            </div>
            <div className="field">
              <label htmlFor="profesor">Nombre del profesor receptor</label>
              <input
                id="profesor"
                autoComplete="off"
                value={draft.teacher}
                minLength={2}
                maxLength={150}
                required
                readOnly={locked}
                onChange={e => setDraft(d => ({ ...d, teacher: e.target.value }))}
                placeholder="Nombre del profesor que recibe el artículo"
              />
            </div>
            {validation &&
              <p role="alert" className="error-text">
                {validation}
              </p>}
            <ErrorNotice error={error} />
            {draft.pending && !busy &&
              <div className="notice">
                <strong>El resultado de la entrega aún no está confirmado.</strong>
                <p>Para evitar registrar una segunda entrega, verifica primero los préstamos del servidor.</p>
                <button type="button" className="btn" onClick={checkResult}>Verificar resultado <Icon name="refresh" />
                </button>
                {checked &&
                  (found ?
                    <Link href={`/admin/prestamos/${found}`}>Hay un préstamo pendiente de esta unidad. Revisar registro</Link> :
                    <>
                      <p>No aparece un préstamo pendiente para esta unidad. Revisa el historial antes de iniciar otra entrega.</p>
                      <Link href="/admin/prestamos">Revisar historial de préstamos</Link>
                      <button
                        type="button"
                        className="btn"
                        onClick={() => setNewIntent(true)}
                      >Iniciar una nueva entrega</button>
                    </>
                  )}
              </div>}
            {storageWarning &&
              <p className="help">Mantén esta página abierta: el navegador no permite guardar el borrador.</p>}
            <div className="form-actions">
              <Link className="btn ghost" href="/admin/prestamos">Volver a préstamos</Link>
              <button
                type="submit"
                className="btn primary"
                disabled={
                  locked ||
                  !!consulta.error ||
                  !consulta.data?.some(d => d.id === draft.device)
                }
              >
                {busy ? "Consultando al servidor…" : "Registrar entrega"}
                <Icon name="check" />
              </button>
            </div>
          </form>
        </>}
      <Sync updated={consulta.updated} error={consulta.error} />
    </section>
    <Modal
      open={newIntent}
      title="Nueva intención de entrega"
      onClose={() => setNewIntent(false)}
    >
      <p>Confirma que revisaste el historial y que esta entrega no fue registrada. El envío anterior no se repetirá automáticamente.</p>
      <div className="form-actions">
        <button className="btn" onClick={() => setNewIntent(false)}>Cancelar</button>
        <button
          className="btn primary"
          onClick={() => {
            setDraft(d => ({ ...d, pending: false, device: 0 }));
            setNewIntent(false);
            setChecked(false);
            setError(undefined);
          }}
        >Preparar nueva entrega</button>
      </div>
    </Modal>
  </>;
}
