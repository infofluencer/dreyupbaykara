import "server-only";

import { assertWhatsAppSendConfig } from "@/lib/whatsapp/config";

export type WhatsAppMediaKind = "image" | "document" | "audio" | "video";

/** Panel + Cloud API practical limits (bytes). WhatsApp document max is higher. */
export const WA_MEDIA_MAX_BYTES: Record<WhatsAppMediaKind, number> = {
  image: 5 * 1024 * 1024,
  document: 20 * 1024 * 1024,
  audio: 16 * 1024 * 1024,
  video: 16 * 1024 * 1024,
};

const MIME_TO_KIND: Record<string, WhatsAppMediaKind> = {
  "image/jpeg": "image",
  "image/jpg": "image",
  "image/png": "image",
  "application/pdf": "document",
};

const EXT_TO_MIME: Record<string, string> = {
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  pdf: "application/pdf",
};

export type ResolvedWhatsAppMedia = {
  kind: WhatsAppMediaKind;
  mime: string;
  fileName: string;
  size: number;
};

function extensionOf(fileName: string): string {
  const parts = fileName.toLowerCase().split(".");
  return parts.length > 1 ? (parts.at(-1) ?? "") : "";
}

/** Map MIME / filename to a supported outbound media kind. */
export function resolveWhatsAppMedia(
  mimeType: string,
  fileName: string,
  size: number,
): ResolvedWhatsAppMedia {
  const rawMime = (mimeType || "").toLowerCase().trim();
  const ext = extensionOf(fileName);
  const mime =
    rawMime && rawMime !== "application/octet-stream"
      ? rawMime === "image/jpg"
        ? "image/jpeg"
        : rawMime
      : EXT_TO_MIME[ext] ?? rawMime;

  const kind = MIME_TO_KIND[mime];
  if (!kind) {
    throw new Error("Desteklenen dosyalar: JPEG, PNG veya PDF.");
  }

  const max = WA_MEDIA_MAX_BYTES[kind];
  if (size <= 0) {
    throw new Error("Dosya boş olamaz.");
  }
  if (size > max) {
    const mb = Math.round(max / (1024 * 1024));
    throw new Error(
      kind === "image"
        ? `Görsel en fazla ${mb} MB olabilir.`
        : `PDF en fazla ${mb} MB olabilir.`,
    );
  }

  const safeName =
    fileName.trim() ||
    (kind === "image" ? `image.${ext || "jpg"}` : `document.${ext || "pdf"}`);

  return { kind, mime, fileName: safeName, size };
}

type UploadResponse = {
  id?: string;
  error?: { message?: string; code?: number | string };
};

/**
 * Graph-compatible media upload (Dualhook or Meta).
 * POST /{phone-number-id}/media → { id }
 */
export async function uploadWhatsAppMedia(input: {
  bytes: ArrayBuffer | Uint8Array | Blob;
  mime: string;
  fileName: string;
}): Promise<{ mediaId: string }> {
  const config = assertWhatsAppSendConfig();
  const url = `${config.apiBase}/${config.phoneNumberId}/media`;

  const blob =
    input.bytes instanceof Blob
      ? input.bytes.type
        ? input.bytes
        : input.bytes.slice(0, input.bytes.size, input.mime)
      : new Blob([input.bytes as BlobPart], { type: input.mime });

  const form = new FormData();
  form.append("messaging_product", "whatsapp");
  form.append("type", input.mime);
  form.append("file", blob, input.fileName);

  const response = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${config.authToken}`,
    },
    body: form,
    cache: "no-store",
  });

  const rawText = await response.text();
  let data: UploadResponse = {};
  try {
    data = rawText.trim() ? (JSON.parse(rawText) as UploadResponse) : {};
  } catch {
    data = { error: { message: rawText } };
  }

  const mediaId = data.id;
  if (!response.ok || !mediaId) {
    console.error("[whatsapp] media upload failed", {
      status: response.status,
      body: data,
    });
    throw new Error(
      data.error?.message ||
        `WhatsApp medya yüklemesi başarısız (HTTP ${response.status}).`,
    );
  }

  return { mediaId };
}
