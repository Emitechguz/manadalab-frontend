"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { LoginForm } from "./LoginForm";
import { useSession } from "@/providers/SessionProvider";
import { errorMessage } from "@/lib/api";

export function SessionLogin({
  destination = "/admin",
  onSuccess
}: {
  destination?: string;
  onSuccess?: () => void
}) {
  const { login } = useSession();
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  return <LoginForm
    pending={pending}
    error={error}
    onSubmit={async credentials => {
      setPending(true);
      setError("");
      try {
        await login(credentials);
        if (onSuccess) onSuccess();
        else
          router.replace(
            destination.startsWith("/admin") && !destination.startsWith("//")
              ? destination
              : "/admin"
          );
      } catch (cause) {
        setError(errorMessage(cause));
      } finally {
        setPending(false);
      }
    }}
  />;
}
