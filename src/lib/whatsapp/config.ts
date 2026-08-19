import "server-only";

export type WhatsAppConfig = {
  /** Dualhook: https://api.dualhook.com/v25.0 — Meta: https://graph.facebook.com/v25.0 */
  apiBase: string;
  /** Dualhook connection key or Meta System User access token */
  authToken: string;
  phoneNumberId: string;
  verifyToken: string;
  appSecret: string;
  enabled: boolean;
  appointmentTemplate: string;
};

function readEnv(name: string): string {
  return process.env[name]?.trim() ?? "";
}

function parseEnabled(value: string): boolean {
  const normalized = value.toLowerCase();
  return normalized === "1" || normalized === "true" || normalized === "yes";
}

function missingSendVars(config: WhatsAppConfig): string[] {
  const missing: string[] = [];
  if (!config.apiBase) missing.push("WHATSAPP_API_BASE");
  if (!config.authToken) missing.push("WHATSAPP_AUTH_TOKEN");
  if (!config.phoneNumberId) missing.push("WHATSAPP_PHONE_NUMBER_ID");
  return missing;
}

/** Read WhatsApp env. Empty strings mean the var is unset. */
export function getWhatsAppConfig(): WhatsAppConfig {
  return {
    apiBase: readEnv("WHATSAPP_API_BASE").replace(/\/+$/, ""),
    authToken: readEnv("WHATSAPP_AUTH_TOKEN"),
    phoneNumberId: readEnv("WHATSAPP_PHONE_NUMBER_ID"),
    verifyToken: readEnv("WHATSAPP_VERIFY_TOKEN"),
    appSecret: readEnv("WHATSAPP_APP_SECRET"),
    enabled: parseEnabled(readEnv("WHATSAPP_ENABLED")),
    appointmentTemplate: readEnv("WHATSAPP_APPOINTMENT_TEMPLATE"),
  };
}

/**
 * Required for outbound Graph-compatible calls (Dualhook or Meta).
 * Throws a single error listing every missing env name.
 */
export function assertWhatsAppSendConfig(): WhatsAppConfig {
  const config = getWhatsAppConfig();
  const missing = missingSendVars(config);
  if (missing.length > 0) {
    throw new Error(
      `WhatsApp gönderim ayarı eksik: ${missing.join(", ")}. Dualhook için WHATSAPP_API_BASE=https://api.dualhook.com/v25.0 ve WHATSAPP_AUTH_TOKEN=connection key; Meta için WHATSAPP_API_BASE=https://graph.facebook.com/v25.0 ve System User access token.`,
    );
  }
  return config;
}

export function isWhatsAppEnabled(): boolean {
  return getWhatsAppConfig().enabled;
}

export function whatsappMessagesUrl(config = assertWhatsAppSendConfig()): string {
  return `${config.apiBase}/${config.phoneNumberId}/messages`;
}

export function whatsappMediaUrl(
  mediaId: string,
  config = assertWhatsAppSendConfig(),
): string {
  return `${config.apiBase}/${encodeURIComponent(mediaId)}`;
}
