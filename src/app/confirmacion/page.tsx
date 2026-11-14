import { Suspense } from "react";
import { PublicShell } from "@/components/layout/PublicShell";
import { Tracking } from "@/components/public/Tracking";
import { Loading } from "@/components/ui/Feedback";
export default function ConfirmationPage() { return <PublicShell><Suspense fallback={<Loading />}><Tracking confirmation /></Suspense></PublicShell>; }
