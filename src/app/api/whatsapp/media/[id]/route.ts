import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Yetkisiz" }, { status: 401 });
  }
  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();
  if (!profile || !["admin", "doctor", "assistant"].includes(profile.role)) {
    return NextResponse.json({ error: "Yetkisiz" }, { status: 403 });
  }

  const { id } = await params;
  const token = process.env.WHATSAPP_ACCESS_TOKEN;
  const apiVersion = process.env.WHATSAPP_GRAPH_API_VERSION;
  if (!token || !apiVersion) {
    return NextResponse.json(
      { error: "WhatsApp API yapılandırılmamış" },
      { status: 503 },
    );
  }

  const metadataResponse = await fetch(
    `https://graph.facebook.com/${apiVersion}/${encodeURIComponent(id)}`,
    {
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
    },
  );
  if (!metadataResponse.ok) {
    return NextResponse.json(
      { error: "Medya bilgisi alınamadı" },
      { status: metadataResponse.status },
    );
  }

  const metadata = (await metadataResponse.json()) as {
    url?: string;
    mime_type?: string;
  };
  if (!metadata.url) {
    return NextResponse.json({ error: "Medya URL’si yok" }, { status: 404 });
  }

  const mediaResponse = await fetch(metadata.url, {
    headers: { Authorization: `Bearer ${token}` },
    cache: "no-store",
  });
  if (!mediaResponse.ok || !mediaResponse.body) {
    return NextResponse.json(
      { error: "Medya indirilemedi" },
      { status: mediaResponse.status },
    );
  }

  return new Response(mediaResponse.body, {
    headers: {
      "Content-Type":
        mediaResponse.headers.get("content-type") ||
        metadata.mime_type ||
        "application/octet-stream",
      "Cache-Control": "private, max-age=300",
      "Content-Disposition": "inline",
    },
  });
}

