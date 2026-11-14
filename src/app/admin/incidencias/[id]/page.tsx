import { notFound } from "next/navigation";
import { IncidentDetail } from "@/components/incidencias/IncidentDetail";
export default async function IncidentPage({ params }: { params: Promise<{ id: string }> }) { const { id } = await params; if (!/^(?:[1-9]\d*|[a-f\d]{8}-[a-f\d]{4}-[a-f\d]{4}-[a-f\d]{4}-[a-f\d]{12})$/i.test(id)) notFound(); return <IncidentDetail id={id} />; }
