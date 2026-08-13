"use client";

import { useRouter } from "next/navigation";
import { planHref } from "@/components/admin/schedule/href";

export function CalendarInspectDate({
  date,
  lead,
  search,
}: {
  date: string;
  lead?: string;
  search?: string;
}) {
  const router = useRouter();

  return (
    <label className="flex min-w-0 flex-1 flex-col gap-1 text-sm font-semibold text-[#123524] sm:flex-row sm:items-center sm:gap-2">
      <span className="text-[#466254]">Tarih seç</span>
      <input
        type="date"
        value={date}
        onChange={(event) => {
          const next = event.target.value;
          if (!next) return;
          router.push(
            planHref({
              view: "day",
              date: next,
              lead,
              q: search,
            }),
          );
        }}
        className="min-h-12 w-full min-w-0 flex-1 rounded-2xl border border-[#123524]/15 bg-white px-3 text-base font-semibold text-[#123524] sm:min-h-10 sm:rounded-full sm:text-sm"
      />
    </label>
  );
}
