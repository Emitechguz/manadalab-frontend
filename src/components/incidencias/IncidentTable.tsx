import Link from "next/link";
import type { Incidencia } from "@/types/domain";
import { fecha, Status } from "@/components/ui/Feedback";
export function IncidentTable({ rows, privada = true }: { rows: Incidencia[]; privada?: boolean }) {
  return <div className="table-wrap"><table className="responsive-table"><caption className="sr-only">Incidencias registradas</caption><thead><tr><th>Dispositivo / Folio</th><th>Aula</th><th>Categoría</th><th>Estado</th><th>Registro</th></tr></thead><tbody>{rows.map(r => <tr key={r.id}><td><Link className="cell-link" href={privada ? `/admin/incidencias/${r.folio}` : `/seguimiento?folio=${r.folio}`}><strong>{r.dispositivo.clave}</strong><small className="mono">{r.folio}</small></Link></td><td className="secondary-cell">Aula {r.dispositivo.aula?.numero || "—"}<small>{r.dispositivo.ema.nombre}</small></td><td className="hide-mobile">{r.dispositivo.tipo.nombre}</td><td className="status-cell"><Status estado={r.estado} /></td><td className="secondary-cell">{fecha(r.creadaEn)}</td></tr>)}</tbody></table></div>;
}
