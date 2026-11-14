"use client";

import { Button } from "@/components/ui/Button";

export default function ErrorPage({ retry }: { error: unknown; retry: () => void }) {
  return (
    <main className="mx-auto flex min-h-screen max-w-lg flex-col justify-center gap-4 p-6">
      <h1 className="text-2xl font-semibold">Ocurrió un error</h1>
      <p>No pudimos cargar esta página. Inténtalo de nuevo.</p>
      <Button onClick={() => retry()}>Reintentar</Button>
    </main>
  );
}
