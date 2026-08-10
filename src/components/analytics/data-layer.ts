"use client";

export function pushDataLayerEvent(
  event: string,
  params?: Record<string, unknown>,
): void {
  if (typeof window === "undefined") return;
  window.dataLayer = window.dataLayer || [];
  window.dataLayer.push({ event, ...(params ?? {}) });
}
