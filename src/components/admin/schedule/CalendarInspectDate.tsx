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
    <label className="flex min-w-0 flex-1 items-center gap-2 text-sm font-semibold text-[#123524]">
      <span className="sr-only sm:not-sr-only sm:text-[#466254]">Tarih seç</span>
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
        className="min-h-10 w-full min-w-0 flex-1 rounded-xl border border-[#123524]/15 bg-white px-2.5 text-sm font-semibold text-[#123524] sm:min-h-10 sm:rounded-full sm:px-3"
      />
    </label>
  );
}
