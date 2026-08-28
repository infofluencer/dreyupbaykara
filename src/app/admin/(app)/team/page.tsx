import { updateProfileRole } from "@/app/admin/actions";
import { SubmitButton } from "@/components/admin/SubmitButton";
import { requireAdminSession } from "@/lib/admin/auth";
import { createClient } from "@/lib/supabase/server";

export default async function TeamPage() {
  await requireAdminSession(["admin"]);
  const supabase = await createClient();
  const { data: profiles, error } = await supabase
    .from("profiles")
    .select("id, full_name, role, created_at")
    .order("created_at");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-[family-name:var(--font-instrument-sans)] text-2xl font-semibold">
          Ekip ve roller
        </h1>
        <p className="mt-2 text-sm text-[#466254]">
          Yeni kullanıcı önce Supabase Authentication → Users ekranından
          oluşturulur; rolü burada atanır.
        </p>
      </div>
      {error ? (
        <p className="rounded-xl bg-red-50 p-4 text-sm text-red-700">
          {error.message}
        </p>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-[#123524]/10 bg-white">
          {profiles?.map((profile) => (
            <form
              key={profile.id}
              action={updateProfileRole}
              className="flex w-full flex-col gap-3 border-b border-[#123524]/8 px-4 py-4 last:border-0 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between sm:px-5"
            >
              <input type="hidden" name="profile_id" value={profile.id} />
              <div className="min-w-0">
                <p className="font-medium">
                  {profile.full_name || "İsimsiz kullanıcı"}
                </p>
                <p className="mt-1 text-xs text-[#466254]">
                  {new Date(profile.created_at).toLocaleDateString("tr-TR")}
                </p>
              </div>
              <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:items-center">
                <select
                  name="role"
                  defaultValue={profile.role}
                  className="min-h-11 w-full rounded-xl border border-[#123524]/15 bg-white px-3 py-2 text-base sm:w-auto sm:text-sm"
                >
                  <option value="admin">Admin</option>
                  <option value="doctor">Doktor</option>
                  <option value="assistant">Asistan</option>
                  <option value="agency">Ajans</option>
                  <option value="editor">Editör</option>
                </select>
                <SubmitButton variant="dark" pendingLabel="Rol kaydediliyor…" className="w-full sm:w-auto">
                  Kaydet
                </SubmitButton>
              </div>
            </form>
          ))}
        </div>
      )}
    </div>
  );
}

