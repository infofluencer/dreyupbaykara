"use client";

import { useEffect } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { captureAttributionFromCurrentUrl } from "@/lib/crm/tracking";

export function AttributionCapture() {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    captureAttributionFromCurrentUrl();
  }, [pathname, searchParams]);

  return null;
}

