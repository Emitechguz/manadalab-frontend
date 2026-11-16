import { AdminShell } from "@/components/layout/AdminShell";
import { Suspense } from "react";
import { Loading } from "@/components/ui/Feedback";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return <Suspense fallback={<Loading />}>
    <AdminShell>{children}</AdminShell>
  </Suspense>;
}
