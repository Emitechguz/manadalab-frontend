"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { useSession } from "@/providers/SessionProvider";
import { SessionLogin } from "@/components/auth/SessionLogin";
import { Brand, PublicShell } from "./PublicShell";
import { Icon } from "@/components/ui/Icon";
import { ErrorNotice, Loading } from "@/components/ui/Feedback";
import { useConsulta } from "@/hooks/useConsulta";
import { manada } from "@/services/manadaService";

export function AdminShell({ children }: { children: React.ReactNode }) {
  const { session, loading, error, logout, refresh } = useSession();
  const [open, setOpen] = useState(false);
  const [logoutError, setLogoutError] = useState<unknown>();
  const [leaving, setLeaving] = useState(false);
  const path = usePathname();
  const menuButton = useRef<HTMLButtonElement>(null);
  const sideRef = useRef<HTMLElement>(null);
  const emas = useConsulta(
    useCallback(signal => manada.emas(signal), []),
    false
  );
  const closeMenu = useCallback(() => {
    setOpen(false);
    menuButton.current?.focus();
  }, []);
  useEffect(() => {
    if (!open) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    sideRef.current?.querySelector<HTMLElement>("a,button")?.focus();
    function key(event: KeyboardEvent) {
      if (event.key === "Escape") closeMenu();
      if (event.key === "Tab") {
        const elements = sideRef.current?.querySelectorAll<HTMLElement>(
          "a,button:not(:disabled)"
        );
        if (!elements?.length) return;
        const first = elements[0],
          last = elements[elements.length - 1];
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first.focus();
        }
      }
    }
    document.addEventListener("keydown", key);
    return () => {
      document.body.style.overflow = previous;
      document.removeEventListener("keydown", key);
    };
  }, [open, closeMenu]);
  if (loading)
    return <PublicShell>
      <Loading />
    </PublicShell>;
  if (!session)
    return <PublicShell>
      <div className="auth-container">
        <p>Inicia sesión para continuar en esta sección.</p>
        <ErrorNotice error={error} retry={refresh} />
        <SessionLogin
          onSuccess={() => {
            void refresh();
          }}
        />
      </div>
    </PublicShell>;
  const usuario = session.usuario;
  const navigation = [
    ["/admin", "grid", "Resumen"],
    ["/admin/incidencias", "report", "Incidencias"],
    ["/admin/aulas", "room", "Aulas"],
    ["/admin/prestamos", "loans", "Préstamos"]
  ];
  return <div className="admin-shell">
    <a className="skip-link" href="#contenido">Saltar al contenido</a>
    {open &&
      <button
        className="menu-backdrop"
        aria-label="Cerrar navegación"
        onClick={closeMenu}
      />}
    <aside
      ref={sideRef}
      className={`sidebar ${open ? "open" : ""}`}
      id="sidebar"
      aria-label="Navegación administrativa"
    >
      <Brand />
      <button
        className="icon-button mobile-menu"
        aria-label="Cerrar navegación"
        onClick={closeMenu}
      >
        <Icon name="close" />
      </button>
      <div className="workspace">
        <Icon name="room" />
        <div>
          <strong>
            {emas.data?.find(e => e.id === usuario.emaId)?.nombre ||
              `EMA ${usuario.emaId}`}
          </strong>
          <small>CU2 · BUAP</small>
        </div>
      </div>
      <div className="nav-label">ESPACIO DE TRABAJO</div>
      <nav className="side-nav">
        {navigation.map(([href, icon, label]) => {
          const active = href === "/admin" ? path === href : path.startsWith(href);
          return <Link
            href={href}
            key={href}
            className={active ? "active" : ""}
            aria-current={active ? "page" : undefined}
            onClick={() => setOpen(false)}
          >
            <Icon name={icon} />
            <span>{label}</span>
          </Link>;
        })}
      </nav>
      <div className="sidebar-bottom">
        <Link href="/">
          <Icon name="arrow" />Ir al sitio público</Link>
        <button
          disabled={leaving}
          onClick={async () => {
            setLeaving(true);
            try {
              await logout();
            } catch (cause) {
              setLogoutError(cause);
            } finally {
              setLeaving(false);
            }
          }}
        >
          <Icon name="logout" />
          {leaving ? "Cerrando sesión…" : "Cerrar sesión"}
        </button>
        <ErrorNotice error={logoutError} />
        <div className="account">
          <div className="avatar">
            {usuario.nombre
              .split(" ")
              .map(n => n[0])
              .slice(0, 2)
              .join("")}
          </div>
          <div>
            <strong>{usuario.nombre}</strong>
            <small>{usuario.esTecnico ? "Técnico" : "Administrador"}</small>
          </div>
        </div>
      </div>
    </aside>
    <div className="admin-body">
      <header className="admin-topbar">
        <div className="row">
          <button
            ref={menuButton}
            className="icon-button mobile-menu"
            aria-label="Abrir navegación"
            aria-controls="sidebar"
            aria-expanded={open}
            onClick={() => setOpen(true)}
          >
            <Icon name="menu" />
          </button>
          <div className="breadcrumb">
            <span>Administración</span>
            <Icon name="chevron" />
            <span>
              {
                navigation
                  .slice()
                  .reverse()
                  .find(([href]) => path.startsWith(href))?.[2]
              }
            </span>
          </div>
        </div>
        <span className="help">CU2 · BUAP</span>
      </header>
      <main className="admin-main" id="contenido">
        <ErrorNotice error={error} retry={refresh} />
        <div key={usuario.id}>{children}</div>
      </main>
    </div>
  </div>;
}
