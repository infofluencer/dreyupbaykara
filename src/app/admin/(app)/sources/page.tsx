import { createClient } from "@/lib/supabase/server";

export default async function AdminSourcesPage() {
  const configured =
    Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL) &&
    Boolean(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

  if (!configured) {
    return (
      <p className="text-sm text-[#466254]">
        Supabase yapılandırılınca tıklama kayıtları burada listelenir.
      </p>
    );
  }

  const supabase = await createClient();
  const { data: rows, error } = await supabase
    .from("lead_source_report")
    .select(
      "id, lead_ref, site, page_path, channel, utm_source, utm_medium, utm_campaign, gclid, fbclid, matched_lead_id, created_at",
    )
    .order("created_at", { ascending: false })
    .limit(50);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-[family-name:var(--font-instrument-sans)] text-2xl font-semibold tracking-tight">
          Kaynak tıklamaları
        </h1>
        <p className="mt-2 text-sm text-[#466254]">
          `/r` üzerinden gelen UTM / GCLID / FBCLID kayıtları (son 50).
        </p>
      </div>

      {error ? (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
          Liste alınamadı: {error.message}
        </p>
      ) : !rows?.length ? (
        <p className="rounded-2xl border border-dashed border-[#123524]/15 bg-white px-5 py-10 text-center text-sm text-[#466254]">
          Henüz tıklama yok. Test:{" "}
          <code className="rounded bg-[#f4f6f5] px-1">/r?utm_source=test</code>
        </p>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-[#123524]/08 bg-white">
          <table className="w-full min-w-[40rem] text-left text-sm">
            <thead className="border-b border-[#123524]/08 bg-[#f7f9f8] text-[#466254]">
              <tr>
                <th className="px-4 py-3 font-medium">Ref</th>
                <th className="px-4 py-3 font-medium">Kaynak</th>
                <th className="px-4 py-3 font-medium">Kampanya</th>
                <th className="px-4 py-3 font-medium">Sayfa</th>
                <th className="px-4 py-3 font-medium">Tarih</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr
                  key={row.id}
                  className="border-b border-[#123524]/06 last:border-0"
                >
                  <td className="px-4 py-3 font-mono text-xs font-semibold">
                    {row.lead_ref}
                    {row.matched_lead_id ? (
                      <span className="ml-2 text-[10px] font-sans font-medium text-[#0b6b45]">
                        eşleşti
                      </span>
                    ) : null}
                  </td>
                  <td className="px-4 py-3 text-[#466254]">
                    {[row.site, row.channel, row.utm_source]
                      .filter(Boolean)
                      .join(" · ") || "—"}
                  </td>
                  <td className="px-4 py-3 text-[#466254]">
                    {row.utm_campaign || "—"}
                    {row.gclid ? (
                      <span className="mt-0.5 block truncate text-[10px] text-[#466254]/70">
                        gclid: {row.gclid}
                      </span>
                    ) : null}
                    {row.fbclid ? (
                      <span className="mt-0.5 block truncate text-[10px] text-[#466254]/70">
                        fbclid: {row.fbclid}
                      </span>
                    ) : null}
                  </td>
                  <td className="px-4 py-3 text-[#466254]">
                    {row.page_path || "—"}
                  </td>
                  <td className="px-4 py-3 text-[#466254]">
                    {new Date(row.created_at).toLocaleString("tr-TR")}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
