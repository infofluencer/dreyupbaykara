"use client";

import { useState } from "react";
import {
  DURATION_OPTIONS,
  defaultDurationForType,
} from "@/lib/crm/duration";

/** Takvim yalnızca ameliyat — tür sabit procedure. */
export function TypeAndDurationFields({
  defaultDuration,
}: {
  /** @deprecated Tür artık her zaman ameliyat; yok sayılır. */
  defaultType?: string;
  defaultDuration?: number;
}) {
  const initial = defaultDuration ?? defaultDurationForType("procedure");
  const [duration, setDuration] = useState(initial);
  const options =
    DURATION_OPTIONS.some((item) => item.minutes === duration)
      ? DURATION_OPTIONS
      : [
          ...DURATION_OPTIONS,
          { minutes: duration, label: `${duration} dk` },
        ].sort((a, b) => a.minutes - b.minutes);

  return (
    <div className="grid grid-cols-1 gap-3 sm:contents">
      <input type="hidden" name="appointment_type" value="procedure" />
      <label className="text-sm font-medium sm:col-span-2">
        Süre
        <select
          name="duration_minutes"
          value={duration}
          onChange={(event) => setDuration(Number(event.target.value))}
          className="mt-1.5 min-h-12 w-full rounded-xl border border-[#123524]/15 bg-white px-3 py-3 text-base"
        >
          {options.map((item) => (
            <option key={item.minutes} value={item.minutes}>
              {item.label}
            </option>
          ))}
        </select>
      </label>
    </div>
  );
}
