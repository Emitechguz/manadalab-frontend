import { SessionLogin } from "@/components/auth/SessionLogin";
import { Brand, PublicShell } from "@/components/layout/PublicShell";

export default function LoginPage() {
  return <PublicShell>
    <div className="auth-container">
      <Brand />
      <SessionLogin />
    </div>
  </PublicShell>;
}
