"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSessionStore } from "@/store/session";

export default function HomePage() {
  const router = useRouter();
  const { session, hydrate } = useSessionStore();

  useEffect(() => {
    hydrate();
  }, [hydrate]);

  useEffect(() => {
    if (session) {
      router.replace("/dashboard");
    } else {
      router.replace("/login");
    }
  }, [session, router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <p className="font-serif text-foreground/60">Redirigiendo…</p>
    </div>
  );
}
