import { Classrooms } from "@/components/aulas/Classrooms";
import { PublicShell } from "@/components/layout/PublicShell";

export default function ClassroomsPage() {
  return <PublicShell>
    <div className="public-main">
      <Classrooms />
    </div>
  </PublicShell>;
}
