import Link from "next/link";
import { createPatient } from "@/app/admin/actions";
import { FormPendingShell } from "@/components/admin/FormPendingShell";
import { SubmitButton } from "@/components/admin/SubmitButton";
import { requireAdminSession } from "@/lib/admin/auth";

const input =
  "mt-1.5 min-h-12 w-full rounded-xl border border-[#123524]/15 bg-white px-3.5 py-3 text-base outline-none focus:border-[#0b6b45]";

function digitsOnly(value: string | undefined): string {
  return (value ?? "").replace(/\D/g, "");
}

function prefillName(name: string | undefined, phoneDigits: string): string {
  if (!name?.trim()) return "";
  const nameDigits = digitsOnly(name);
  if (nameDigits && nameDigits === phoneDigits) return "";
  return name.trim();
}

export default async function NewPatientPage({
  searchParams,
}: {
  searchParams: Promise<{ phone?: string; name?: string }>;
}) {
  await requireAdminSession(["admin", "doctor", "assistant"]);
  const params = await searchParams;
  const phoneDigits = digitsOnly(params.phone);
  const defaultName = prefillName(params.name, phoneDigits);
  const defaultPhone = phoneDigits || "";

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <Link
          href="/admin/patients"
          className="text-sm font-medium text-[#0b6b45]"
        >
          ← Hastalar
        </Link>
        <h1 className="mt-3 font-[family-name:var(--font-instrument-sans)] text-2xl font-semibold">
          Yeni hasta kimliği
        </h1>
        <p className="mt-2 text-sm text-[#466254]">
          Telefon daha önce kayıtlıysa mevcut kimlik güncellenir. Takvimde
          randevu yazabilmek için otomatik talep de açılır.
        </p>
      </div>

      <form
        action={createPatient}
        className="space-y-5 rounded-2xl border border-[#123524]/10 bg-white p-5 sm:p-7"
      >
        <FormPendingShell className="space-y-5">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Ad soyad">
            <input
              name="name"
              required
              defaultValue={defaultName}
              className={input}
            />
          </Field>
          <Field label="Telefon">
            <input
              name="phone"
              type="tel"
              inputMode="tel"
              required
              defaultValue={defaultPhone}
              placeholder="0530 123 45 67"
              className={input}
            />
          </Field>
          <Field label="T.C. kimlik no">
            <input name="national_id" inputMode="numeric" className={input} />
          </Field>
          <Field label="Doğum tarihi">
            <input name="birth_date" type="date" className={input} />
          </Field>
          <Field label="Cinsiyet">
            <select name="gender" defaultValue="" className={input}>
              <option value="">Belirtilmedi</option>
              <option value="female">Kadın</option>
              <option value="male">Erkek</option>
              <option value="other">Diğer</option>
            </select>
          </Field>
          <Field label="Şehir">
            <input name="city" placeholder="İstanbul" className={input} />
          </Field>
        </div>
        <Field label="Adres">
          <input name="address" className={input} />
        </Field>
        <Field label="Alerji / dikkat">
          <input
            name="allergies"
            placeholder="İlaç alerjisi, kanama bozukluğu vb."
            className={input}
          />
        </Field>
        <Field label="Klinik özet">
          <textarea
            name="summary"
            rows={3}
            placeholder="Tanı, geçirilmiş ameliyat, önemli öykü"
            className={input}
          />
        </Field>
        <Field label="İlk not">
          <select name="note_kind" defaultValue="clinical" className={input}>
            <option value="clinical">Klinik not</option>
            <option value="surgery">Ameliyat notu</option>
            <option value="followup">Kontrol notu</option>
            <option value="admin">İdari not</option>
          </select>
          <textarea
            name="first_note"
            rows={4}
            placeholder="İlk muayene / şikayet özeti"
            className={`${input} mt-2`}
          />
        </Field>
        </FormPendingShell>
        <SubmitButton pendingLabel="Hasta kaydediliyor…" className="px-6">
          Hastayı kaydet
        </SubmitButton>
      </form>
    </div>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block text-sm font-medium">
      {label}
      {children}
    </label>
  );
}
