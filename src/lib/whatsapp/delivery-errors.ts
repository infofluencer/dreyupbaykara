/**
 * Meta teslim hatalarının tekrar denenebilirlik sınıflandırması.
 *
 * Buradaki liste bilinçli olarak dar: yalnızca Meta'nın mesajı **hiç teslim
 * etmediği** ve sebebin kendiliğinden geçtiği kodlar var. Bu şart olmadan
 * tekrar deneme, teslim edilmiş bir mesajı ikinci kez göndererek hastaya
 * mükerrer hatırlatma yaşatır (bu hata daha önce yaşandı).
 */

/** Geçici hata sonrası bir gönderimi en fazla kaç kez yeniden açarız. */
export const MAX_DISPATCH_RETRIES = 2;

/**
 * Tekrar denenebilir Meta hata kodları.
 *
 * - 130429 · hız limiti aşıldı — kuyruk boşalınca geçer.
 * - 131000 · Meta tarafında beklenmeyen hata — Meta'nın kendi önerisi tekrar denemek.
 * - 131042 · işletme ödeme/uygunluk sorunu — ödeme yöntemi düzelince geçer.
 * - 131056 · gönderici-alıcı çifti için hız limiti — kısa süre sonra geçer.
 *
 * Bilinçli olarak dışarıda bırakılanlar:
 * - 131049 · alıcının pazarlama mesajı kotası. Meta en az 24 saat beklenmesini
 *   söylüyor; bizim tekrar penceresi 1 saat olduğu için denemek boşa gider ve
 *   numaranın kalite puanını yer.
 * - 131026 · mesaj iletilemez (numara WhatsApp'ta değil vb.) — kalıcı.
 * - 132xxx · şablon uyuşmazlığı — kalıcı yapılandırma hatası, elle düzeltilmeli.
 * - 133xxx · hesap askıya alınmış/kısıtlı — elle müdahale gerekir.
 */
const RETRYABLE_DELIVERY_CODES = new Set([130429, 131000, 131042, 131056]);

export function isRetryableDeliveryCode(code: number | null | undefined): boolean {
  if (typeof code !== "number") return false;
  return RETRYABLE_DELIVERY_CODES.has(code);
}

/**
 * Teslim hatası alan bir gönderim yeniden açılmalı mı?
 * Kod geçici olmalı ve tekrar bütçesi tükenmemiş olmalı.
 */
export function shouldReopenDispatch(opts: {
  code: number | null | undefined;
  retryCount: number;
}): boolean {
  if (!isRetryableDeliveryCode(opts.code)) return false;
  return opts.retryCount < MAX_DISPATCH_RETRIES;
}
