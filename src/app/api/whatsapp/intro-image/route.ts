import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { INTRO_IMAGE_MIME, readIntroImage } from "@/lib/whatsapp/bot-intro";

export const runtime = "nodejs";

/**
 * İlk mesaj görselinin admin önizlemesi. Görsel `public/` altında olmadığı için
 * (hasta fotoğrafı) yalnızca oturumu olan ekip üyelerine servis edilir.
 */
export async function GET() {
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
  if (!profile || !["admin", "editor"].includes(profile.role)) {
    return NextResponse.json({ error: "Yetkisiz" }, { status: 403 });
  }

  try {
    const bytes = await readIntroImage();
    return new Response(new Uint8Array(bytes), {
      headers: {
        "Content-Type": INTRO_IMAGE_MIME,
        "Cache-Control": "private, max-age=300",
        "Content-Disposition": "inline",
      },
    });
  } catch (error) {
    console.error("[whatsapp] intro image read:", error);
    return NextResponse.json({ error: "Görsel bulunamadı" }, { status: 404 });
  }
}
