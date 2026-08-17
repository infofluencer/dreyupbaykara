import "server-only";

/** Read WhatsApp Cloud API env (supports legacy names). */
export function getWhatsAppConfig() {
  return {
    phoneId:
      process.env.WHATSAPP_PHONE_ID ??
      process.env.WHATSAPP_PHONE_NUMBER_ID ??
      "",
    token:
      process.env.WHATSAPP_TOKEN ??
      process.env.WHATSAPP_ACCESS_TOKEN ??
      "",
    apiVersion:
      process.env.WHATSAPP_API_VERSION ??
      process.env.WHATSAPP_GRAPH_API_VERSION ??
      "v25.0",
    verifyToken: process.env.WHATSAPP_VERIFY_TOKEN ?? "",
    appSecret: process.env.WHATSAPP_APP_SECRET ?? "",
    wabaId: process.env.WHATSAPP_WABA_ID ?? "",
  };
}

export function assertWhatsAppSendConfig() {
  const { phoneId, token, apiVersion } = getWhatsAppConfig();
  if (!phoneId || !token || !apiVersion) {
    throw new Error(
      "WhatsApp Cloud API env missing (WHATSAPP_PHONE_ID, WHATSAPP_TOKEN, WHATSAPP_API_VERSION).",
    );
  }
  return { phoneId, token, apiVersion };
}
