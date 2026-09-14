import "server-only";

import { readFile } from "node:fs/promises";
import path from "node:path";
import type { SupabaseClient } from "@supabase/supabase-js";
import { cannedMessageBody } from "@/lib/whatsapp/canned-messages";
import { isWhatsAppEnabled } from "@/lib/whatsapp/config";
import { uploadWhatsAppMedia } from "@/lib/whatsapp/media";
import { sendMediaMessage, sendMessage } from "@/lib/whatsapp/send-message";

/** Panelin “Genel bilgilendirme” hazır mesajıyla aynı metin — tek kaynak. */
export const INTRO_BODY = cannedMessageBody("genel-bilgilendirme");

export const INTRO_IMAGE_FILE = "islem_bolgesi.jpeg";
export const INTRO_IMAGE_MIME = "image/jpeg";
export const INTRO_IMAGE_CAPTION =
  "İşlem bölgesi: 4-5 mm’lik tek giriş noktası. Dikiş, kesi ve pansuman süreci yok.";

/**
 * Hasta fotoğrafı bilinçli olarak `public/` dışında: siteden herkese açık
 * servis edilmesin, yalnızca WhatsApp gönderimi ve admin önizlemesi okusun.
 * `next.config.ts` içindeki outputFileTracingIncludes bu klasörü standalone
 * çıktısına dahil eder.
 */
const INTRO_IMAGE_DIR = "assets/whatsapp";

export function readIntroImage(): Promise<Buffer> {
  return readFile(
    path.join(process.cwd(), ...INTRO_IMAGE_DIR.split("/"), INTRO_IMAGE_FILE),
  );
}

/** Meta media id ~30 gün geçerli; her ilk mesajda yeniden yüklememek için. */
const MEDIA_ID_TTL_MS = 24 * 60 * 60 * 1000;

let cachedMedia: { mediaId: string; expiresAt: number } | null = null;

async function introMediaId(): Promise<string> {
  if (cachedMedia && cachedMedia.expiresAt > Date.now()) return cachedMedia.mediaId;

  const { mediaId } = await uploadWhatsAppMedia({
    bytes: await readIntroImage(),
    mime: INTRO_IMAGE_MIME,
    fileName: INTRO_IMAGE_FILE,
  });

  cachedMedia = { mediaId, expiresAt: Date.now() + MEDIA_ID_TTL_MS };
  return mediaId;
}

async function hasOutboundMessage(
  supabase: SupabaseClient,
  conversationId: string,
): Promise<boolean> {
  const { data } = await supabase
    .from("messages")
    .select("id")
    .eq("conversation_id", conversationId)
    .eq("direction", "outbound")
    .limit(1)
    .maybeSingle();
  return Boolean(data);
}

/**
 * intro_sent_at'i atomik olarak sahiplen. Aynı webhook iki kez düşerse ikinci
 * çağrı false döner, bilgilendirme tek sefer gider.
 */
async function claimIntro(
  supabase: SupabaseClient,
  conversationId: string,
): Promise<boolean> {
  const { data, error } = await supabase
    .from("conversations")
    .update({ intro_sent_at: new Date().toISOString() })
    .eq("id", conversationId)
    .is("intro_sent_at", null)
    .select("id")
    .maybeSingle();

  if (error) {
    console.error("[whatsapp] intro claim:", error.message);
    return false;
  }
  return Boolean(data);
}

async function releaseIntro(supabase: SupabaseClient, conversationId: string) {
  const { error } = await supabase
    .from("conversations")
    .update({ intro_sent_at: null })
    .eq("id", conversationId);
  if (error) {
    console.error("[whatsapp] intro release:", error.message);
  }
}

/**
 * Hastanın ilk mesajında genel bilgilendirme metnini ve işlem bölgesi görselini
 * gönderir. Daha önce bilgilendirilmiş ya da panelden yazışılmış konuşmalarda
 * hiçbir şey yapmaz.
 *
 * @returns Bilgilendirme gönderildiyse true — bu durumda diğer bot akışı atlanır.
 */
export async function maybeSendIntroMessage(options: {
  supabase: SupabaseClient;
  conversationId: string;
  phone: string;
}): Promise<boolean> {
  const { supabase, conversationId, phone } = options;

  // WA kapalıyken webhook'un kendisi zaten erken dönüyor.
  if (!isWhatsAppEnabled()) return false;

  // Panelden ya da otomasyondan daha önce yazılmışsa hasta bizim için yeni değil.
  if (await hasOutboundMessage(supabase, conversationId)) return false;
  if (!(await claimIntro(supabase, conversationId))) return false;

  const context = {
    to: phone,
    conversationId,
    supabase,
    sentBy: null,
    source: "bot" as const,
    automated: true,
  };

  try {
    await sendMessage(phone, INTRO_BODY, context);
  } catch (error) {
    await releaseIntro(supabase, conversationId);
    throw error;
  }

  try {
    await sendMediaMessage(
      phone,
      {
        mediaType: "image",
        mediaId: await introMediaId(),
        caption: INTRO_IMAGE_CAPTION,
        filename: INTRO_IMAGE_FILE,
      },
      context,
    );
  } catch (error) {
    // Metin gitti; görsel için kilidi geri açmıyoruz ki bilgilendirme tekrarlanmasın.
    console.error("[whatsapp] intro image:", error);
    cachedMedia = null;
  }

  return true;
}
