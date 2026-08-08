import "server-only";

import { connection } from "next/server";
import { istanbulYmd } from "@/lib/date/tr";

/** Request-time clock in Europe/Istanbul. */
export async function getIstanbulNow(): Promise<Date> {
  await connection();
  return new Date();
}

export async function getIstanbulTodayYmd(): Promise<string> {
  return istanbulYmd(await getIstanbulNow());
}
