"use client";

import { useState } from "react";
import { createAppointment } from "@/app/admin/actions";
import { TypeAndDurationFields } from "@/components/admin/schedule/TypeAndDurationFields";
import type { ScheduleLead } from "@/components/admin/schedule/types";
import { firstRelation } from "@/lib/crm/labels";

export function AppointmentQuickForm({
  leads,
  selectedLeadId,
  startsAt,
  view,
  error,
}: {
  leads: ScheduleLead[];
  selectedLeadId?: string;
  startsAt: string;
  view?: "day" | "week" | "month" | "year";
  error?: string | null;
}) {
  const initial = selectedLeadId
    ? firstRelation(leads.find((lead) => lead.id === selectedLeadId)?.contacts)
    : null;
  const [leadId, setLeadId] = useState(selectedLeadId ?? "");
  const [name, setName] = useState(initial?.name ?? "");
  const [phone, setPhone] = useState(initial?.phone ?? "");

  function onLeadChange(nextId: string) {
    setLeadId(nextId);
    if (!nextId) {
      setName("");
      setPhone("");
      return;
    }
    const contact = firstRelation(
      leads.find((lead) => lead.id === nextId)?.contacts,
    );
    setName(contact?.name ?? "");
    setPhone(contact?.phone ?? "");
  }

  return (
    <form
      key={`${selectedLeadId ?? "new"}-${startsAt}`}
      action={createAppointment}
      className="grid gap-3 rounded-2xl border border-[#123524]/10 bg-white p-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 xl:items-end"
    >
      {error ? (
        <p className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-800 sm:col-span-2 lg:col-span-3 xl:col-span-6">
          {error}
        </p>
      ) : null}
      {view && view !== "day" ? (
        <input type="hidden" name="redirect_view" value={view} />
      ) : null}
      <label className="text-sm font-medium">
        Kayıtlı hasta
        <select
          name="lead_id"
          value={leadId}
          onChange={(event) => onLeadChange(event.target.value)}
          className="mt-1.5 w-full rounded-xl border border-[#123524]/15 bg-white px-3 py-2.5"
        >
          <option value="">Yeni hasta</option>
          {leads.map((lead) => {
            const item = firstRelation(lead.contacts);
            return (
              <option key={lead.id} value={lead.id}>
                {item?.name || "İsimsiz"} · {item?.phone}
              </option>
            );
          })}
        </select>
      </label>
      <label className="text-sm font-medium">
        Ad soyad
        <input
          name="name"
          value={name}
          onChange={(event) => setName(event.target.value)}
          required={!leadId}
          readOnly={Boolean(leadId)}
          placeholder="Hasta adı"
          className={`mt-1.5 w-full rounded-xl border border-[#123524]/15 px-3 py-2.5 ${
            leadId ? "cursor-not-allowed bg-[#f4f6f5] text-[#466254]" : "bg-white"
          }`}
        />
      </label>
      <label className="text-sm font-medium">
        Telefon
        <input
          name="phone"
          type="tel"
          inputMode="tel"
          value={phone}
          onChange={(event) => setPhone(event.target.value)}
          required={!leadId}
          readOnly={Boolean(leadId)}
          placeholder="0530 123 45 67"
          className={`mt-1.5 w-full rounded-xl border border-[#123524]/15 px-3 py-2.5 ${
            leadId ? "cursor-not-allowed bg-[#f4f6f5] text-[#466254]" : "bg-white"
          }`}
        />
      </label>
      <label className="text-sm font-medium">
        Başlangıç
        <input
          name="starts_at"
          type="datetime-local"
          required
          defaultValue={startsAt}
          className="mt-1.5 w-full rounded-xl border border-[#123524]/15 px-3 py-2.5"
        />
      </label>
      <TypeAndDurationFields />
      <button className="rounded-full bg-[#0b6b45] px-5 py-2.5 text-sm font-semibold text-white sm:col-span-2 xl:col-span-6">
        Randevu ekle
      </button>
    </form>
  );
}
