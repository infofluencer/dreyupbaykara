/** Public Pixel ID — gizlilik gerektirmez; env yoksa Ads Manager’daki kimlik. */
export const OPENAI_ADS_PIXEL_ID =
  process.env.NEXT_PUBLIC_OPENAI_ADS_PIXEL_ID?.trim() ||
  "TWeWYVAgLzCtEHdZm3CpAP";
