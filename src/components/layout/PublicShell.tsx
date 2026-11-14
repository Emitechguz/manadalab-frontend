import Link from "next/link";
import { Icon } from "@/components/ui/Icon";
export function Brand() { return <Link href="/" className="brand" aria-label="ManadaLab, inicio"><span className="brandmark"><Icon name="logo" /></span><span>ManadaLab</span></Link>; }
export function PublicShell({ children }: { children: React.ReactNode }) {
  return <><a className="skip-link" href="#contenido">Saltar al contenido</a><header className="container public-header"><div className="row"><Brand /><span className="institution">CU2 · BUAP</span></div><nav className="navlinks" aria-label="Principal"><Link className="how-link" href="/aulas">Consultar aulas</Link><Link href="/seguimiento">Consultar reporte</Link><Link href="/login" className="btn"><Icon name="lock" />Acceso del personal</Link></nav></header><main id="contenido">{children}</main><footer className="page-footer"><span>ManadaLab / CU2 · BUAP</span><span>Cuidemos juntos nuestros espacios de aprendizaje.</span></footer></>;
}
