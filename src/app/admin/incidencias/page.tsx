import { Suspense } from "react";
import { Incidents } from "@/components/incidencias/Incidents";
import { Loading } from "@/components/ui/Feedback";
export default function IncidentsPage() { return <Suspense fallback={<Loading />}><Incidents /></Suspense>; }
