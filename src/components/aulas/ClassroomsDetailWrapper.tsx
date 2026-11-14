import { ClassroomDetail } from "./Classrooms";
import { PublicShell } from "@/components/layout/PublicShell";
export function ClassroomsDetailWrapper({ id }: { id: number }) { return <PublicShell><div className="public-main"><ClassroomDetail id={id} /></div></PublicShell>; }
