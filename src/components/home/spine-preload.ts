import { SPINE_GLB } from "./spine-asset";

const DESKTOP_MQ = "(min-width: 1024px)";

export function isDesktopViewport(): boolean {
  return (
    typeof window !== "undefined" &&
    window.matchMedia(DESKTOP_MQ).matches
  );
}

/** React hydrate beklemeden 3D chunk + GLB indirmesini başlat. */
export function warmDesktopSpine(): void {
  if (!isDesktopViewport()) return;
  void import("./SpineScene");
  void fetch(SPINE_GLB, {
    mode: "cors",
    credentials: "omit",
    cache: "force-cache",
  }).catch(() => {});
}

warmDesktopSpine();
