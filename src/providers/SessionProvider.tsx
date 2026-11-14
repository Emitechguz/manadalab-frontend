"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { ApiError, isObject } from "@/lib/api";
import { authService } from "@/services/authService";
import type { LoginCredentials } from "@/types/auth";
import type { Sesion } from "@/types/domain";

function parseSession(value: unknown): Sesion {
  if (
    !isObject(value) ||
    !isObject(value.usuario) ||
    typeof value.csrfToken !== "string" ||
    typeof value.usuario.id !== "number" ||
    typeof value.usuario.nombre !== "string" ||
    typeof value.usuario.correo !== "string" ||
    typeof value.usuario.emaId !== "number" ||
    typeof value.usuario.esTecnico !== "boolean"
  ) {
    throw new Error("Sesión no válida.");
  }
  return value as Sesion;
}

type SessionContextValue = {
  session: Sesion | null;
  loading: boolean;
  error: unknown;
  login: (credentials: LoginCredentials) => Promise<void>;
  logout: () => Promise<void>;
  refresh: () => Promise<void>;
};

const SessionContext = createContext<SessionContextValue | null>(null);

export function SessionProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Sesion | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<unknown>();
  // Una consulta anterior al login/logout no puede restablecer una sesión obsoleta.
  const revision = useRef(0);

  const refresh = useCallback(async () => {
    const current = revision.current;
    try {
      const value = parseSession(await authService.context());
      if (current === revision.current) {
        setSession(value);
        setError(undefined);
      }
    } catch (cause) {
      if (current === revision.current) {
        if (cause instanceof ApiError && cause.status === 401) {
          setSession(null);
          setError(undefined);
        } else {
          setError(cause);
        }
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const initial = setTimeout(() => { void refresh(); }, 0);
    const onFocus = () => {
      if (!document.hidden) void refresh();
    };
    const expired = () => {
      revision.current++;
      setSession(null);
    };
    const timer = setInterval(onFocus, 15000);
    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onFocus);
    window.addEventListener("manadalab:session-expired", expired);
    return () => {
      clearTimeout(initial);
      clearInterval(timer);
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onFocus);
      window.removeEventListener("manadalab:session-expired", expired);
    };
  }, [refresh]);

  const login = async (credentials: LoginCredentials) => {
    revision.current++;
    setSession(parseSession(await authService.login(credentials)));
    setError(undefined);
  };

  const logout = async () => {
    if (!session) return;
    revision.current++;
    try {
      await authService.logout(session.csrfToken);
    } catch (cause) {
      if (!(cause instanceof ApiError && cause.status === 401)) throw cause;
    }
    revision.current++;
    setSession(null);
  };

  return (
    <SessionContext.Provider value={{ session, loading, error, login, logout, refresh }}>
      {children}
    </SessionContext.Provider>
  );
}

export function useSession() {
  const context = useContext(SessionContext);
  if (!context) throw new Error("Falta el proveedor de sesión.");
  return context;
}
