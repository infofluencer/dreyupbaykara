import "server-only";

type WhatsAppSendResponse = {
  messages?: Array<{ id: string }>;
  error?: { message?: string };
};

export async function sendWhatsAppText(
  to: string,
  body: string,
): Promise<{ messageId: string }> {
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
  const accessToken = process.env.WHATSAPP_ACCESS_TOKEN;
  const apiVersion = process.env.WHATSAPP_GRAPH_API_VERSION;

  if (!phoneNumberId || !accessToken || !apiVersion) {
    throw new Error(
      "WhatsApp Cloud API ortam değişkenleri eksik (PHONE_NUMBER_ID, ACCESS_TOKEN, GRAPH_API_VERSION).",
    );
  }

  const response = await fetch(
    `https://graph.facebook.com/${apiVersion}/${phoneNumberId}/messages`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        recipient_type: "individual",
        to,
        type: "text",
        text: {
          preview_url: false,
          body,
        },
      }),
      cache: "no-store",
    },
  );

  const data = (await response.json()) as WhatsAppSendResponse;
  const messageId = data.messages?.[0]?.id;
  if (!response.ok || !messageId) {
    throw new Error(
      data.error?.message || `WhatsApp gönderimi başarısız (${response.status})`,
    );
  }

  return { messageId };
}

export async function sendWhatsAppTemplate(
  to: string,
  templateName: string,
  languageCode = "tr",
): Promise<{ messageId: string }> {
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
  const accessToken = process.env.WHATSAPP_ACCESS_TOKEN;
  const apiVersion = process.env.WHATSAPP_GRAPH_API_VERSION;
  if (!phoneNumberId || !accessToken || !apiVersion) {
    throw new Error("WhatsApp Cloud API ortam değişkenleri eksik.");
  }

  const response = await fetch(
    `https://graph.facebook.com/${apiVersion}/${phoneNumberId}/messages`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        to,
        type: "template",
        template: {
          name: templateName,
          language: { code: languageCode },
        },
      }),
      cache: "no-store",
    },
  );
  const data = (await response.json()) as WhatsAppSendResponse;
  const messageId = data.messages?.[0]?.id;
  if (!response.ok || !messageId) {
    throw new Error(
      data.error?.message || `Şablon gönderimi başarısız (${response.status})`,
    );
  }
  return { messageId };
}

