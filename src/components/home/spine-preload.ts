const DESKTOP_MQ = "(min-width: 1024px)";

export function isDesktopViewport(): boolean {
  return (
    typeof window !== "undefined" &&
    window.matchMedia(DESKTOP_MQ).matches
  );
}

/**
 * React hydrate beklemeden 3D chunk indirmesini başlat.
 * GLB'yi burada `fetch` etmiyoruz: dosyayı `<link rel="preload">` başlatıyor,
 * indirmeyi three.js'in kendi yükleyicisi devralıyor. Ek bir `fetch` farklı
 * kimlik moduyla gittiği için aynı 2.3MB'ı paralel olarak tekrar indiriyordu.
 */
export function warmDesktopSpine(): void {
  if (!isDesktopViewport()) return;
  void import("./SpineScene");
}

warmDesktopSpine();
