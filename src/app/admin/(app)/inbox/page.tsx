import Link from "next/link";
import { redirect } from "next/navigation";
import { requireAdminSession } from "@/lib/admin/auth";
import { createClient } from "@/lib/supabase/server";

export default async function AdminInboxPage({
  searchParams,
}: {
  searchParams: Promise<{ lead?: string }>;
}) {
  await requireAdminSession(["admin", "doctor", "assistant"]);
  const query = await searchParams;
  const supabase = await createClient();

  if (query.lead) {
    const { data } = await supabase
      .from("conversations")
      .select("id")
      .eq("lead_id", query.lead)
      .maybeSingle();
    if (data) redirect(`/admin/inbox/${data.id}`);
  }

  const { data: conversations, error } = await supabase
    .from("conversations")
    .select(
      "id, lead_id, last_message_at, contacts(name, phone), leads(stage, site, channel)",
    )
    .order("last_message_at", { ascending: false, nullsFirst: false })
    .limit(100);

  return (
    <div className="space-y-6">
      <h1 className="font-[family-name:var(--font-instrument-sans)] text-xl font-semibold tracking-tight sm:text-2xl">
        WhatsApp gelen kutusu
      </h1>
      {error ? (
        <p className="rounded-xl bg-red-50 p-4 text-sm text-red-700">
          {error.message}
        </p>
      ) : !conversations?.length ? (
        <div className="rounded-2xl border border-dashed border-[#123524]/15 bg-white px-5 py-12 text-center text-sm text-[#466254]">
          Henüz konuşma yok. Meta webhook bağlandıktan sonra gelen mesajlar
          burada görünecek.
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-[#123524]/10 bg-white">
          {conversations.map((conversation) => {
            const contact = Array.isArray(conversation.contacts)
              ? conversation.contacts[0]
              : conversation.contacts;
            const lead = Array.isArray(conversation.leads)
              ? conversation.leads[0]
              : conversation.leads;
            return (
              <Link
                key={conversation.id}
                href={`/admin/inbox/${conversation.id}`}
                className="flex min-h-16 items-start justify-between gap-3 border-b border-[#123524]/8 px-4 py-4 last:border-0 active:bg-[#f7f9f8] sm:items-center sm:px-5"
              >
                <div>
                  <p className="font-semibold">
                    {contact?.name || contact?.phone || "Bilinmeyen kişi"}
                  </p>
                  <p className="mt-1 text-xs text-[#466254]">
                    {[lead?.site, lead?.channel, lead?.stage]
                      .filter(Boolean)
                      .join(" · ") || "WhatsApp"}
                  </p>
                </div>
                <p className="shrink-0 text-right text-xs text-[#466254]">
                  {conversation.last_message_at
                    ? new Date(conversation.last_message_at).toLocaleString(
                        "tr-TR",
                      )
                    : "—"}
                </p>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
