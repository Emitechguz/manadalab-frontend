import Link from "next/link";

export default function NotFoundPage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-4 p-6">
      <h1 className="text-2xl font-semibold">Página no encontrada</h1>
      <p>La dirección que buscas no existe.</p>
      <Link href="/" className="underline underline-offset-4">
        Volver al inicio
      </Link>
    </main>
  );
}
