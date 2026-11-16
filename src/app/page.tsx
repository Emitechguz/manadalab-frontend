import Link from "next/link";
import { PublicShell } from "@/components/layout/PublicShell";
import { Icon } from "@/components/ui/Icon";

export default function HomePage() {
  return <PublicShell>
    <div className="container">
      <section className="landing-hero" aria-labelledby="hero-title">
        <div className="hero-copy">
          <div className="eyebrow">Nuestras aulas. Nuestro espacio.</div>
          <h1 id="hero-title">Un mejor espacio<br />empieza <span>contigo.</span>
          </h1>
          <p>Ayúdanos a mantener las aulas de CU2 funcionando. Reporta una falla en equipos o instalaciones y consulta su estado en un solo lugar.</p>
          <Link href="/reportar" className="btn primary">Reportar problema <Icon name="arrow" />
          </Link>
          <div className="hero-note">
            <Icon name="shield" />Sin crear una cuenta. Solo necesitas tu matrícula.</div>
        </div>
        <div
          className="hero-scene"
          aria-label="Ilustración de selección de un dispositivo; no representa inventario real"
        >
          <div className="room-preview">
            <div className="row between">
              <div>
                <div className="mini-label">CU2 · VISTA ILUSTRATIVA</div>
                <h3>Tu aula</h3>
              </div>
              <Icon name="room" />
            </div>
            <div className="preview-pcs">
              {[1, 2, 3, 4, 5, 6].map(n =>
                <div key={n} className={`preview-pc ${n === 3 ? "marked" : ""}`}>
                  <Icon name="pc" />PC-0{n}
                </div>)}
            </div>
            <div className="preview-footer">
              <span>Un reporte hace la diferencia.</span>
              <span className="pill seen">Seleccionado</span>
            </div>
          </div>
          <div className="floating-update">
            <div className="check-orb">
              <Icon name="check" />
            </div>
            <div>
              <strong>Reporta. Consulta. Sigamos aprendiendo.</strong>
              <p>Seguimiento claro, del reporte a la solución.</p>
            </div>
          </div>
        </div>
      </section>
      <section className="how-section" id="como-funciona">
        <div className="how-top">
          <h2>Una falla menos. Una clase mejor.</h2>
          <p>Así de sencillo es contribuir.</p>
        </div>
        <div className="steps-grid">
          {[
            [
              "Ubica el dispositivo",
              "Elige tu aula y busca la clave del equipo en su etiqueta física."
            ],
            [
              "Cuéntanos qué sucede",
              "Describe la falla y escribe tu matrícula. Tu información no se muestra públicamente."
            ],
            [
              "Consulta el avance",
              "Guarda tu folio y revisa si el reporte está pendiente, visto o solucionado."
            ]
          ].map(([title, text], i) =>
            <article className="how-step" key={title}>
              <span className="step-num">0{i + 1}</span>
              <div>
                <h3>{title}</h3>
                <p>{text}</p>
              </div>
            </article>)}
        </div>
      </section>
      <section className="lookup-band">
        <div>
          <h3>¿Ya hiciste un reporte?</h3>
          <p>Consulta su estado con el folio que recibiste.</p>
        </div>
        <Link className="text-link" href="/seguimiento">Consultar reporte <Icon name="arrow" />
        </Link>
      </section>
    </div>
  </PublicShell>;
}
