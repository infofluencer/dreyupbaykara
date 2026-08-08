import { updateProfileRole } from "@/app/admin/actions";
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
              className="flex flex-wrap items-center justify-between gap-3 border-b border-[#123524]/8 px-5 py-4 last:border-0"
            >
              <input type="hidden" name="profile_id" value={profile.id} />
              <div>
                <p className="font-medium">
                  {profile.full_name || "İsimsiz kullanıcı"}
                </p>
                <p className="mt-1 text-xs text-[#466254]">
                  {new Date(profile.created_at).toLocaleDateString("tr-TR")}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <select
                  name="role"
                  defaultValue={profile.role}
                  className="rounded-xl border border-[#123524]/15 bg-white px-3 py-2 text-sm"
                >
                  <option value="admin">Admin</option>
                  <option value="doctor">Doktor</option>
                  <option value="assistant">Asistan</option>
                  <option value="agency">Ajans</option>
                  <option value="editor">Editör</option>
                </select>
                <button className="rounded-full bg-[#123524] px-4 py-2 text-sm font-semibold text-white">
                  Kaydet
                </button>
              </div>
            </form>
          ))}
        </div>
      )}
    </div>
  );
}

