"use client";

import { useState } from "react";
import {
  DURATION_OPTIONS,
  defaultDurationForType,
} from "@/lib/crm/duration";

export function TypeAndDurationFields({
  defaultType = "consultation",
  defaultDuration,
}: {
  defaultType?: string;
  defaultDuration?: number;
}) {
  const [type, setType] = useState(defaultType);
  const [durationTouched, setDurationTouched] = useState(
    defaultDuration != null,
  );
  const [duration, setDuration] = useState(
    defaultDuration ?? defaultDurationForType(defaultType),
  );
  const options =
    DURATION_OPTIONS.some((item) => item.minutes === duration)
      ? DURATION_OPTIONS
      : [
          ...DURATION_OPTIONS,
          { minutes: duration, label: `${duration} dk` },
        ].sort((a, b) => a.minutes - b.minutes);

  return (
    <>
      <label className="text-sm font-medium">
        Tür
        <select
          name="appointment_type"
          value={type}
          onChange={(event) => {
            const next = event.target.value;
            setType(next);
            if (!durationTouched) setDuration(defaultDurationForType(next));
          }}
          className="mt-1.5 w-full rounded-xl border border-[#123524]/15 bg-white px-3 py-2.5"
        >
          <option value="consultation">İlk muayene</option>
          <option value="control">Kontrol</option>
          <option value="procedure">Ameliyat</option>
          <option value="online">Online görüşme</option>
          <option value="other">Diğer</option>
        </select>
      </label>
      <label className="text-sm font-medium">
        Süre
        <select
          name="duration_minutes"
          value={duration}
          onChange={(event) => {
            setDurationTouched(true);
            setDuration(Number(event.target.value));
          }}
          className="mt-1.5 w-full rounded-xl border border-[#123524]/15 bg-white px-3 py-2.5"
        >
          {options.map((item) => (
            <option key={item.minutes} value={item.minutes}>
              {item.label}
            </option>
          ))}
        </select>
      </label>
    </>
  );
}
