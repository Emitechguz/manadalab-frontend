"use client";
import { useState, type FormEvent } from "react";
import type { LoginCredentials } from "@/types/auth";
import { Icon } from "@/components/ui/Icon";

export function LoginForm({ onSubmit, pending = false, error }: { onSubmit: (credentials: LoginCredentials) => void | Promise<void>; pending?: boolean; error?: string }) {
  const [show, setShow] = useState(false);
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); if (pending) return;
    const data = new FormData(event.currentTarget);
    void onSubmit({ correo: String(data.get("correo") || ""), contrasena: String(data.get("contrasena") || "") });
  }
  return <section className="panel panel-pad"><div className="login-symbol"><Icon name="lock" /></div><h1>Acceso del personal</h1><p>Administración y soporte de CU2.</p><form onSubmit={submit} aria-busy={pending}><div className="field"><label htmlFor="correo">Correo electrónico</label><input id="correo" name="correo" type="email" autoComplete="username" autoCapitalize="none" maxLength={254} required readOnly={pending} placeholder="tu.correo@institucion.mx" /></div><div className="field"><label htmlFor="contrasena">Contraseña</label><div className="input-icon"><input id="contrasena" name="contrasena" type={show ? "text" : "password"} autoComplete="current-password" maxLength={128} required readOnly={pending} placeholder="Escribe tu contraseña" /><button type="button" aria-label={show ? "Ocultar contraseña" : "Mostrar contraseña"} aria-pressed={show} onClick={() => setShow(!show)}><Icon name="eye" /></button></div></div>{error && <p role="alert" className="error-text">{error}</p>}<button type="submit" className="btn primary block" disabled={pending}>{pending ? "Iniciando sesión…" : "Iniciar sesión"}<Icon name="arrow" /></button></form><p className="login-footer">Acceso exclusivo para personal autorizado.<br />Las cuentas son precargadas por el equipo.</p></section>;
}
