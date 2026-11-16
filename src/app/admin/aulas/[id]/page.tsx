import { notFound } from "next/navigation";
import { AdminClassrooms } from "@/components/admin/AdminClassrooms";

export default async function AulaPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!/^[1-9]\d*$/.test(id) || Number(id) > 2147483647) notFound();
  return <AdminClassrooms id={Number(id)} />;
}
