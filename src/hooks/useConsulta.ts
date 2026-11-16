"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export function useConsulta<T>(
  loader: (signal: AbortSignal) => Promise<T>,
  refresh = true
) {
  const [state, setState] = useState<{
    loader: typeof loader;
    data?: T;
    error?: unknown;
    updated?: Date;
    finished: boolean;
  }>({ loader, finished: false });
  const controller = useRef<AbortController | null>(null);

  const run = useCallback(async () => {
    controller.current?.abort();
    const current = new AbortController();
    controller.current = current;
    try {
      const value = await loader(current.signal);
      if (!current.signal.aborted) {
        setState({ loader, data: value, updated: new Date(), finished: true });
      }
    } catch (cause) {
      if (!current.signal.aborted) {
        setState(previous => ({
          ...(previous.loader === loader ? previous : { loader }),
          error: cause,
          finished: true,
        }));
      }
    } finally {
      if (controller.current === current) controller.current = null;
    }
  }, [loader]);

  useEffect(() => {
    void run();
    const visible = () => {
      if (!document.hidden && refresh && !controller.current) void run();
    };
    const timer = refresh ? setInterval(visible, 15000) : undefined;
    window.addEventListener("focus", visible);
    document.addEventListener("visibilitychange", visible);
    return () => {
      clearInterval(timer);
      controller.current?.abort();
      controller.current = null;
      window.removeEventListener("focus", visible);
      document.removeEventListener("visibilitychange", visible);
    };
  }, [run, refresh]);

  // Al cambiar de recurso, no exponer datos de la consulta anterior ni un instante.
  const current = state.loader === loader ? state : undefined;
  return {
    data: current?.data,
    error: current?.error,
    loading: !current?.finished,
    updated: current?.updated,
    reload: run,
  };
}
