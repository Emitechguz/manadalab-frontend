"use client";
import { Classrooms, ClassroomDetail } from "@/components/aulas/Classrooms";
import { useSession } from "@/providers/SessionProvider";

export function AdminClassrooms({ id }: { id?: number }) {
  const { session } = useSession();
  return id ?
    <ClassroomDetail id={id} emaId={session!.usuario.emaId} privada /> :
    <Classrooms emaId={session!.usuario.emaId} privada />;
}
