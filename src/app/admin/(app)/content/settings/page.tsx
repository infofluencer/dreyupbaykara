import Link from "next/link";
import { saveSiteSettings } from "@/app/admin/actions";
import { requireAdminSession } from "@/lib/admin/auth";
import { createClient } from "@/lib/supabase/server";

const input =
  "mt-1.5 w-full rounded-xl border border-[#123524]/15 bg-white px-3.5 py-2.5 text-sm outline-none focus:border-[#0b6b45]";

export default async function SiteSettingsPage() {
  await requireAdminSession(["admin", "editor"]);
  const supabase = await createClient();
  const { data } = await supabase
    .from("site_settings")
    .select("setting_key, value")
    .in("setting_key", [
      "contact.phone",
      "contact.email",
      "contact.clinic",
    ]);
  const settings = Object.fromEntries(
    (data ?? []).map((item) => [item.setting_key, item.value]),
  );
  const clinic =
    typeof settings["contact.clinic"] === "object" &&
    settings["contact.clinic"] !== null
      ? (settings["contact.clinic"] as { name?: string; city?: string })
      : {};

  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/admin/content"
          className="text-sm font-medium text-[#0b6b45]"
        >
          ← İçerikler
        </Link>
        <h1 className="mt-3 font-[family-name:var(--font-instrument-sans)] text-2xl font-semibold">
          Site ayarları
        </h1>
      </div>
      <form
        action={saveSiteSettings}
        className="grid gap-5 rounded-2xl border border-[#123524]/10 bg-white p-5 sm:grid-cols-2 sm:p-7"
      >
        <Field label="Telefon">
          <input
            name="phone"
            required
            defaultValue={String(settings["contact.phone"] ?? "")}
            className={input}
          />
        </Field>
        <Field label="E-posta">
          <input
            name="email"
            type="email"
            required
            defaultValue={String(settings["contact.email"] ?? "")}
            className={input}
          />
        </Field>
        <Field label="Klinik adı">
          <input
            name="clinic_name"
            required
            defaultValue={clinic.name ?? ""}
            className={input}
          />
        </Field>
        <Field label="Klinik adresi / şehir">
          <input
            name="clinic_city"
            required
            defaultValue={clinic.city ?? ""}
            className={input}
          />
        </Field>
        <button className="rounded-full bg-[#0b6b45] px-6 py-2.5 text-sm font-semibold text-white sm:col-span-2 sm:justify-self-start">
          Ayarları kaydet
        </button>
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

