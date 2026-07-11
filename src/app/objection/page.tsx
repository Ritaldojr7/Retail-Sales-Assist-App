"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function ObjectionRedirect() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/?open=objection");
  }, [router]);

  return (
    <div className="flex items-center justify-center min-h-[50vh]">
      <span className="w-8 h-8 border-2 border-text-secondary/20 border-t-brand-yellow rounded-full animate-spin" />
    </div>
  );
}
