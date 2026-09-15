import { NextResponse, type NextRequest } from "next/server";
import { runRemindersJob } from "@/lib/whatsapp/run-reminders-job";

export const runtime = "nodejs";

async function runReminders(request: NextRequest) {
  const cronSecret = process.env.CRON_SECRET;
  if (
    !cronSecret ||
    request.headers.get("authorization") !== `Bearer ${cronSecret}`
  ) {
    return NextResponse.json({ error: "Yetkisiz" }, { status: 401 });
  }

  try {
    const result = await runRemindersJob();
    return NextResponse.json(result);
  } catch (err) {
    return NextResponse.json(
      {
        error:
          err instanceof Error
            ? err.message
            : "Randevu bitiş / hatırlatma başarısız",
      },
      { status: 500 },
    );
  }
}

/** Vercel Cron varsayılan GET; VPS curl genelde POST. */
export async function GET(request: NextRequest) {
  return runReminders(request);
}

export async function POST(request: NextRequest) {
  return runReminders(request);
}
