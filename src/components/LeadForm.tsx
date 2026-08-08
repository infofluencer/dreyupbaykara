"use client";

import { useState, type ChangeEvent, type FormEvent } from "react";
import { buildTrackingPath } from "@/lib/crm/tracking";

type FormState = {
  name: string;
  surgeryRecommended: string;
  lastMri: string;
  seenSpecialist: string;
  age: string;
};

const INITIAL: FormState = {
  name: "",
  surgeryRecommended: "",
  lastMri: "",
  seenSpecialist: "",
  age: "",
};

export function LeadForm() {
  const [form, setForm] = useState<FormState>(INITIAL);

  const set =
    (key: keyof FormState) =>
    (e: ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
      setForm((prev) => ({ ...prev, [key]: e.target.value }));
    };

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) return;

    const href = buildTrackingPath({
      site: "endoskopikbelameliyati",
      channel: "lead_form",
      page: "/#randevu-formu",
      extra: {
        name: form.name.trim(),
        surgeryRecommended: form.surgeryRecommended || undefined,
        lastMri: form.lastMri || undefined,
        seenSpecialist: form.seenSpecialist || undefined,
        age: form.age || undefined,
      },
    });

    window.location.href = href;
  };

  return (
    <section
      id="randevu-formu"
      className="relative px-6 py-14 md:px-10 md:py-16 lg:px-16"
      aria-labelledby="lead-form-title"
    >
      <div className="mx-auto max-w-xl">
        <form
          onSubmit={onSubmit}
          className="rounded-[1.75rem] border border-[#0b6b45]/12 bg-white px-6 py-8 shadow-[0_16px_48px_rgba(18,53,36,0.06)] sm:px-8 sm:py-10"
        >
          <div className="text-center">
            <p className="text-sm font-semibold tracking-wide text-[#0b6b45]">
              Op. Dr. Eyüp Baykara
            </p>
            <h2
              id="lead-form-title"
              className="mt-2 font-[family-name:var(--font-instrument-sans)] text-2xl font-semibold tracking-tight text-[#123524] sm:text-[1.75rem]"
            >
              Kalçadan Bacağa Vuran Ağrı
            </h2>
            <p className="mt-3 text-sm leading-6 text-[#466254]">
              Full Endoskopik Tam Kapalı Fıtık Ameliyatı ile aynı gün taburcu
              olun. Formu doldurun, sizi arayalım.
            </p>
          </div>

          <div className="mt-8 space-y-5">
            <Field label="İsim">
              <input
                required
                name="name"
                autoComplete="name"
                placeholder="Adınız"
                value={form.name}
                onChange={set("name")}
                className={inputClass}
              />
            </Field>

            <Field label="Size daha önce cerrahi müdahale (ameliyat) önerildi mi?">
              <select
                name="surgeryRecommended"
                value={form.surgeryRecommended}
                onChange={set("surgeryRecommended")}
                className={inputClass}
              >
                <option value="">Seçiniz</option>
                <option value="Evet">Evet</option>
                <option value="Hayır">Hayır</option>
              </select>
            </Field>

            <Field label="En son ne zaman MR (emar) çektirdiniz?">
              <input
                name="lastMri"
                placeholder="Örn. 3 ay önce"
                value={form.lastMri}
                onChange={set("lastMri")}
                className={inputClass}
              />
            </Field>

            <Field label="Daha önce beyin ve sinir cerrahisi uzmanına muayene oldunuz mu?">
              <select
                name="seenSpecialist"
                value={form.seenSpecialist}
                onChange={set("seenSpecialist")}
                className={inputClass}
              >
                <option value="">Seçiniz</option>
                <option value="Evet">Evet</option>
                <option value="Hayır">Hayır</option>
              </select>
            </Field>

            <Field label="Kaç yaşındasınız?">
              <input
                name="age"
                inputMode="numeric"
                placeholder="Yaşınız"
                value={form.age}
                onChange={set("age")}
                className={inputClass}
              />
            </Field>
          </div>

          <div className="mt-8">
            <button
              type="submit"
              className="inline-flex w-full items-center justify-center rounded-full bg-[#0b6b45] px-6 py-3.5 text-sm font-semibold text-white transition hover:bg-[#085436]"
            >
              İletişime geç
            </button>
          </div>
        </form>
      </div>
    </section>
  );
}

const inputClass =
  "mt-2 w-full rounded-xl border border-[#0b6b45]/15 bg-[#f7f1e9]/50 px-4 py-3 text-sm text-[#123524] outline-none transition placeholder:text-[#466254]/45 focus:border-[#0b6b45]/45 focus:bg-white";

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="text-sm font-semibold text-[#123524]">{label}</span>
      {children}
    </label>
  );
}
