import { notFound } from "next/navigation";
import { ClassroomsDetailWrapper } from "@/components/aulas/ClassroomsDetailWrapper";
import { Suspense } from "react";
import { Loading } from "@/components/ui/Feedback";

async function Detail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!/^[1-9]\d*$/.test(id) || Number(id) > 2147483647) notFound();
  return <ClassroomsDetailWrapper id={Number(id)} />;
}

export default function ClassroomPage(props: { params: Promise<{ id: string }> }) {
  return <Suspense fallback={<Loading />}>
    <Detail {...props} />
  </Suspense>;
}
