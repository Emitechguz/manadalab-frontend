import { Suspense } from "react";
import { PublicShell } from "@/components/layout/PublicShell";
import { Tracking } from "@/components/public/Tracking";
import { Loading } from "@/components/ui/Feedback";

export default function TrackingPage() {
  return <PublicShell>
    <Suspense fallback={<Loading />}>
      <Tracking />
    </Suspense>
  </PublicShell>;
}
