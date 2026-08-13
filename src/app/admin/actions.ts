"use server";

import { readFile } from "node:fs/promises";
import path from "node:path";
import { revalidatePath } from "next/cache";
import { redirect, unstable_rethrow } from "next/navigation";
import { requireAdminSession } from "@/lib/admin/auth";
import {
  appointmentEndIso,
  findOverlappingAppointments,
} from "@/lib/crm/schedule";
import { titleFromType } from "@/lib/crm/duration";
import { formatTimeTr, istanbulYmd } from "@/lib/date/tr";
import {
  LEGACY_SITE_IMAGES,
  mimeFromFileName,
} from "@/lib/cms/legacy-media";
import { mergeHomeSections, type HomeSections } from "@/lib/cms/home";
import { createServiceClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import {
  sendWhatsAppTemplate,
  sendWhatsAppText,
} from "@/lib/whatsapp/cloud-api";
import {
  isConversationLockFresh,
  isWhatsAppServiceWindowOpen,
} from "@/lib/whatsapp/service-window";
import type { LeadStage } from "@/types/crm";

function text(formData: FormData, key: string): string {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

function optionalText(formData: FormData, key: string): string | null {
  return text(formData, key) || null;
}

function checked(formData: FormData, key: string): boolean {
  return formData.get(key) === "on" || formData.get(key) === "true";
}

function appointmentStartsAt(formData: FormData): string | null {
  const date = text(formData, "starts_date");
  const time = text(formData, "starts_time");
  if (date && time) return istanbulIso(`${date}T${time}`);
  return istanbulIso(text(formData, "starts_at"));
}

function istanbulIso(value: string | null): string | null {
  if (!value) return null;
  let raw = value.trim();
  const dotted = raw.match(
    /^(\d{2})[./](\d{2})[./](\d{4})(?:[ T,]|,\s*)(\d{1,2}):(\d{2})/,
  );
  if (dotted) {
    raw = `${dotted[3]}-${dotted[2]}-${dotted[1]}T${dotted[4].padStart(2, "0")}:${dotted[5]}`;
  }
  const withSeconds = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(raw)
    ? `${raw}:00`
    : raw;
  const dated = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}$/.test(withSeconds)
    ? `${withSeconds}+03:00`
    : withSeconds;
  const date = new Date(dated);
  if (Number.isNaN(date.getTime())) throw new Error("Geçersiz tarih.");
  return date.toISOString();
}

function normalizeSlug(value: string): string {
  if (value === "/") return "/";
  const cleaned = value
    .toLocaleLowerCase("tr-TR")
    .replaceAll("ı", "i")
    .replaceAll("ğ", "g")
    .replaceAll("ü", "u")
    .replaceAll("ş", "s")
    .replaceAll("ö", "o")
    .replaceAll("ç", "c")
    .replace(/[^a-z0-9/]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^[-/]+|[-/]+$/g, "");
  return `/${cleaned}`;
}

function normalizePhone(value: string): string {
  let digits = value.replace(/\D/g, "");
  if (digits.startsWith("00")) digits = digits.slice(2);
  if (digits.length === 10 && digits.startsWith("5")) digits = `90${digits}`;
  if (digits.length === 11 && digits.startsWith("0")) {
    digits = `90${digits.slice(1)}`;
  }
  if (digits.length < 10 || digits.length > 15) {
    throw new Error("Geçerli bir telefon numarası girin.");
  }
  return digits;
}

export async function createManualLead(formData: FormData) {
  const session = await requireAdminSession(["admin", "doctor", "assistant"]);
  const supabase = await createClient();
  const phone = normalizePhone(text(formData, "phone"));
  const name = text(formData, "name");

  const { data: contact, error: contactError } = await supabase
    .from("contacts")
    .upsert({ phone, name: name || phone }, { onConflict: "phone" })
    .select("id")
    .single();
  if (contactError || !contact) {
    throw new Error(contactError?.message || "Kişi oluşturulamadı.");
  }

  const { data: existing } = await supabase
    .from("leads")
    .select("id")
    .eq("contact_id", contact.id)
    .not("stage", "in", "(won,lost,spam)")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (existing) redirect(`/admin/patients/${contact.id}`);

  const { data: lead, error } = await supabase
    .from("leads")
    .insert({
      contact_id: contact.id,
      stage: "new",
      site: "manual",
      channel: text(formData, "channel") || "manual",
      notes: optionalText(formData, "notes"),
      assigned_to: session.userId,
    })
    .select("id")
    .single();
  if (error || !lead) {
    throw new Error(error?.message || "Talep oluşturulamadı.");
  }

  revalidatePath("/admin/leads");
  revalidatePath("/admin/patients");
  redirect(`/admin/patients/${contact.id}`);
}

export async function createPatient(formData: FormData) {
  const session = await requireAdminSession(["admin", "doctor", "assistant"]);
  const supabase = await createClient();
  const phone = normalizePhone(text(formData, "phone"));
  const name = text(formData, "name");
  if (!name) throw new Error("Ad soyad zorunludur.");

  const { data: contact, error: contactError } = await supabase
    .from("contacts")
    .upsert(
      {
        phone,
        name,
        birth_date: optionalText(formData, "birth_date"),
        national_id: optionalText(formData, "national_id"),
        gender: optionalText(formData, "gender"),
        city: optionalText(formData, "city"),
        address: optionalText(formData, "address"),
        allergies: optionalText(formData, "allergies"),
        summary: optionalText(formData, "summary"),
      },
      { onConflict: "phone" },
    )
    .select("id")
    .single();
  if (contactError || !contact) {
    throw new Error(contactError?.message || "Hasta oluşturulamadı.");
  }

  const firstNote = optionalText(formData, "first_note");
  if (firstNote) {
    const { error: noteError } = await supabase.from("patient_notes").insert({
      contact_id: contact.id,
      body: firstNote,
      kind: text(formData, "note_kind") || "clinical",
      created_by: session.userId,
    });
    if (noteError) throw new Error(noteError.message);
  }

  const { data: existingLead } = await supabase
    .from("leads")
    .select("id")
    .eq("contact_id", contact.id)
    .not("stage", "in", "(won,lost,spam)")
    .limit(1)
    .maybeSingle();
  if (!existingLead) {
    const { error: leadError } = await supabase.from("leads").insert({
      contact_id: contact.id,
      stage: "new",
      site: "manual",
      channel: text(formData, "channel") || "manual",
      assigned_to: session.userId,
    });
    if (leadError) throw new Error(leadError.message);
  }

  revalidatePath("/admin/patients");
  revalidatePath("/admin/leads");
  redirect(`/admin/patients/${contact.id}`);
}

export async function updatePatient(formData: FormData) {
  await requireAdminSession(["admin", "doctor", "assistant"]);
  const supabase = await createClient();
  const id = text(formData, "contact_id");
  if (!id) throw new Error("Hasta bulunamadı.");
  const phone = normalizePhone(text(formData, "phone"));
  const name = text(formData, "name");
  if (!name) throw new Error("Ad soyad zorunludur.");

  const { error } = await supabase
    .from("contacts")
    .update({
      phone,
      name,
      birth_date: optionalText(formData, "birth_date"),
      national_id: optionalText(formData, "national_id"),
      gender: optionalText(formData, "gender"),
      city: optionalText(formData, "city"),
      address: optionalText(formData, "address"),
      allergies: optionalText(formData, "allergies"),
      summary: optionalText(formData, "summary"),
    })
    .eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/admin/patients");
  revalidatePath(`/admin/patients/${id}`);
  revalidatePath("/admin/leads");
}

export async function createPatientNote(formData: FormData) {
  const session = await requireAdminSession(["admin", "doctor", "assistant"]);
  const supabase = await createClient();
  const contactId = text(formData, "contact_id");
  const body = text(formData, "body");
  if (!contactId || !body) throw new Error("Not metni zorunludur.");
  const { error } = await supabase.from("patient_notes").insert({
    contact_id: contactId,
    body,
    kind: text(formData, "kind") || "clinical",
    created_by: session.userId,
  });
  if (error) throw new Error(error.message);
  revalidatePath(`/admin/patients/${contactId}`);
  revalidatePath("/admin/patients");
}

export async function deletePatientNote(formData: FormData) {
  await requireAdminSession(["admin", "doctor", "assistant"]);
  const supabase = await createClient();
  const id = text(formData, "id");
  const contactId = text(formData, "contact_id");
  if (!id) throw new Error("Not bulunamadı.");
  const { error } = await supabase.from("patient_notes").delete().eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/admin/patients");
  if (contactId) revalidatePath(`/admin/patients/${contactId}`);
}

export async function saveContentPage(formData: FormData) {
  const session = await requireAdminSession(["admin", "editor", "agency"]);
  const supabase = await createClient();
  const id = text(formData, "id");
  const status = text(formData, "status") || "draft";
  const slug = normalizeSlug(text(formData, "slug"));
  const pageType = text(formData, "page_type") || "page";

  if (!slug || !text(formData, "title")) {
    throw new Error("Başlık ve sayfa yolu zorunludur.");
  }

  const payload = {
    slug,
    page_type: pageType,
    title: text(formData, "title"),
    excerpt: optionalText(formData, "excerpt"),
    status,
    featured_image_path: optionalText(formData, "featured_image_path"),
    featured_image_alt: optionalText(formData, "featured_image_alt"),
    seo_title: optionalText(formData, "seo_title"),
    seo_description: optionalText(formData, "seo_description"),
    canonical_url: optionalText(formData, "canonical_url"),
    published_at:
      status === "published" ? new Date().toISOString() : null,
    updated_by: session.userId,
  };

  if (id) {
    const { error } = await supabase
      .from("content_pages")
      .update(payload)
      .eq("id", id);
    if (error) throw new Error(error.message);
    revalidatePath("/admin/content");
    revalidatePath(`/admin/content/${id}`);
    revalidatePath(slug);
    return;
  }

  const { data, error } = await supabase
    .from("content_pages")
    .insert({ ...payload, created_by: session.userId })
    .select("id")
    .single();
  if (error) throw new Error(error.message);

  revalidatePath("/admin/content");
  redirect(`/admin/content/${data.id}`);
}

export async function deleteContentPage(formData: FormData) {
  await requireAdminSession(["admin"]);
  const supabase = await createClient();
  const id = text(formData, "id");
  const { error } = await supabase.from("content_pages").delete().eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/admin/content");
  redirect("/admin/content");
}

export async function saveContentSection(formData: FormData) {
  const session = await requireAdminSession(["admin", "editor", "agency"]);
  const supabase = await createClient();
  const id = text(formData, "id");
  const pageId = text(formData, "page_id");
  const rawJson = text(formData, "content");
  let content: unknown;

  if (rawJson) {
    try {
      content = JSON.parse(rawJson);
    } catch {
      throw new Error("Bölüm içeriği geçerli JSON olmalıdır.");
    }
  } else {
    content = {
      text: optionalText(formData, "text"),
      paragraphs: text(formData, "paragraphs")
        .split(/\n\s*\n/)
        .map((value) => value.trim())
        .filter(Boolean),
      items: text(formData, "items")
        .split("\n")
        .map((value) => value.trim())
        .filter(Boolean),
      image_path: optionalText(formData, "image_path"),
      image_alt: optionalText(formData, "image_alt"),
    };
  }

  const payload = {
    page_id: pageId,
    section_key: text(formData, "section_key"),
    section_type: text(formData, "section_type") || "text",
    title: optionalText(formData, "title"),
    content,
    sort_order: Number(text(formData, "sort_order") || 0),
    is_visible: checked(formData, "is_visible"),
    updated_by: session.userId,
  };

  const result = id
    ? await supabase.from("content_sections").update(payload).eq("id", id)
    : await supabase
        .from("content_sections")
        .insert({ ...payload, created_by: session.userId });

  if (result.error) throw new Error(result.error.message);
  revalidatePath(`/admin/content/${pageId}`);
}

export async function deleteContentSection(formData: FormData) {
  await requireAdminSession(["admin", "editor"]);
  const supabase = await createClient();
  const id = text(formData, "id");
  const pageId = text(formData, "page_id");
  const { error } = await supabase
    .from("content_sections")
    .delete()
    .eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath(`/admin/content/${pageId}`);
}

export async function deleteMediaAsset(formData: FormData) {
  await requireAdminSession(["admin", "editor"]);
  const supabase = await createClient();
  const id = text(formData, "id");
  const objectPath = text(formData, "object_path");

  const { error: storageError } = await supabase.storage
    .from("site-media")
    .remove([objectPath]);
  if (storageError) throw new Error(storageError.message);

  const { error } = await supabase.from("media_assets").delete().eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/admin/media");
  revalidatePath("/admin/content");
}

export async function importExistingSiteMedia() {
  const session = await requireAdminSession(["admin", "editor"]);
  const supabase = createServiceClient() ?? (await createClient());

  let uploaded = 0;
  let linked = 0;
  let failed = 0;

  for (const item of LEGACY_SITE_IMAGES) {
    const filePath = path.join(process.cwd(), "public", item.publicPath);
    let buffer: Buffer;
    try {
      buffer = await readFile(filePath);
    } catch {
      failed += 1;
      continue;
    }

    const mime = mimeFromFileName(item.publicPath);
    const { error: uploadError } = await supabase.storage
      .from("site-media")
      .upload(item.objectPath, buffer, {
        contentType: mime,
        upsert: true,
      });
    if (uploadError) {
      failed += 1;
      continue;
    }

    const { error: metaError } = await supabase.from("media_assets").upsert(
      {
        bucket_id: "site-media",
        object_path: item.objectPath,
        file_name: item.publicPath.split("/").pop() ?? item.publicPath,
        mime_type: mime,
        size_bytes: buffer.length,
        alt_text: item.alt,
        uploaded_by: session.userId,
      },
      { onConflict: "bucket_id,object_path" },
    );
    if (metaError) {
      failed += 1;
      continue;
    }
    uploaded += 1;

    for (const slug of item.pageSlugs) {
      const { data, error } = await supabase
        .from("content_pages")
        .update({
          featured_image_path: item.objectPath,
          featured_image_alt: item.alt,
        })
        .eq("slug", slug)
        .is("featured_image_path", null)
        .select("id");
      if (!error) linked += data?.length ?? 0;
    }
  }

  revalidatePath("/admin/media");
  revalidatePath("/admin/content");
  revalidatePath("/");
  revalidatePath("/hakkimizda");
  revalidatePath("/hasta-deneyimleri");
  revalidatePath("/tedaviler/bel-fitigi-ameliyati");
  revalidatePath("/tedaviler/boyun-fitigi-ameliyati");
  revalidatePath("/tedaviler/kanal-darligi-ameliyati");
  redirect(
    `/admin/content?tab=media&imported=${uploaded}&linked=${linked}&failed=${failed}`,
  );
}

export async function saveSiteSettings(formData: FormData) {
  const session = await requireAdminSession(["admin", "editor", "agency"]);
  const supabase = await createClient();
  const rows = [
    {
      setting_key: "contact.phone",
      value: text(formData, "phone"),
      is_public: true,
      updated_by: session.userId,
    },
    {
      setting_key: "contact.email",
      value: text(formData, "email"),
      is_public: true,
      updated_by: session.userId,
    },
    {
      setting_key: "contact.clinic",
      value: {
        name: text(formData, "clinic_name"),
        city: text(formData, "clinic_city"),
      },
      is_public: true,
      updated_by: session.userId,
    },
  ];
  const { error } = await supabase
    .from("site_settings")
    .upsert(rows, { onConflict: "setting_key" });
  if (error) throw new Error(error.message);
  revalidatePath("/admin/content/settings");
  revalidatePath("/admin/content");
  revalidatePath("/iletisim");
}

const HOME_SECTION_KEYS = [
  "hero",
  "whyUs",
  "leadForm",
  "instagram",
  "testimonials",
  "youtube",
  "blog",
  "banner",
] as const;

function homeFromForm(formData: FormData, current: HomeSections): HomeSections {
  const key = text(formData, "section");
  if (!(HOME_SECTION_KEYS as readonly string[]).includes(key)) {
    throw new Error("Geçersiz section.");
  }
  if (key === "hero") {
    return {
      ...current,
      hero: {
        ...current.hero,
        kicker: text(formData, "kicker") || current.hero.kicker,
        titleBefore: text(formData, "title_before") || current.hero.titleBefore,
        titleHighlight:
          text(formData, "title_highlight") || current.hero.titleHighlight,
        titleAfter: text(formData, "title_after") || current.hero.titleAfter,
        line1: text(formData, "line1") || current.hero.line1,
        line1Highlight:
          text(formData, "line1_highlight") || current.hero.line1Highlight,
        line2: text(formData, "line2") || current.hero.line2,
        description: text(formData, "description") || current.hero.description,
        ctaLabel: text(formData, "cta_label") || current.hero.ctaLabel,
        ctaHref: text(formData, "cta_href") || current.hero.ctaHref,
        doctorName1: text(formData, "doctor_name_1") || current.hero.doctorName1,
        doctorName2: text(formData, "doctor_name_2") || current.hero.doctorName2,
        doctorBio: text(formData, "doctor_bio") || current.hero.doctorBio,
        rating: text(formData, "rating") || current.hero.rating,
        reviewCount: text(formData, "review_count") || current.hero.reviewCount,
        doctorImage: text(formData, "doctor_image") || current.hero.doctorImage,
        doctorYears: text(formData, "doctor_years") || current.hero.doctorYears,
        doctorPerk: text(formData, "doctor_perk") || current.hero.doctorPerk,
      },
    };
  }
  if (key === "whyUs") {
    return {
      ...current,
      whyUs: {
        label: text(formData, "label") || current.whyUs.label,
        text: text(formData, "text") || current.whyUs.text,
        image: text(formData, "image") || current.whyUs.image,
        stats: [1, 2].map((i) => ({
          icon: text(formData, `stat${i}_icon`) || current.whyUs.stats[i - 1]?.icon || "heart",
          value: Number(text(formData, `stat${i}_value`) || current.whyUs.stats[i - 1]?.value || 0),
          suffix: text(formData, `stat${i}_suffix`) || current.whyUs.stats[i - 1]?.suffix || "",
          label: text(formData, `stat${i}_label`) || current.whyUs.stats[i - 1]?.label || "",
        })),
      },
    };
  }
  if (key === "banner") {
    return {
      ...current,
      banner: {
        image: text(formData, "image") || current.banner.image,
        alt: text(formData, "alt") || current.banner.alt,
      },
    };
  }
  const blockKey = key as "leadForm" | "instagram" | "testimonials" | "youtube" | "blog";
  return {
    ...current,
    [blockKey]: {
      ...current[blockKey],
      kicker: text(formData, "kicker") || current[blockKey].kicker,
      title: text(formData, "title") || current[blockKey].title,
      description:
        optionalText(formData, "description") ?? current[blockKey].description,
      ctaLabel: optionalText(formData, "cta_label") ?? current[blockKey].ctaLabel,
    },
  };
}

export async function saveHomeSection(formData: FormData) {
  const session = await requireAdminSession(["admin", "editor", "agency"]);
  const supabase = await createClient();
  const { data } = await supabase
    .from("site_settings")
    .select("value")
    .eq("setting_key", "home.sections")
    .maybeSingle();
  const current = mergeHomeSections(data?.value);
  const next = homeFromForm(formData, current);
  const { error } = await supabase.from("site_settings").upsert(
    {
      setting_key: "home.sections",
      value: next,
      is_public: true,
      updated_by: session.userId,
    },
    { onConflict: "setting_key" },
  );
  if (error) throw new Error(error.message);
  revalidatePath("/admin/content");
  revalidatePath("/");
}

export async function updateProfileRole(formData: FormData) {
  const session = await requireAdminSession(["admin"]);
  const supabase = await createClient();
  const profileId = text(formData, "profile_id");
  const role = text(formData, "role");
  const allowed = ["admin", "doctor", "assistant", "agency", "editor"];
  if (!allowed.includes(role)) throw new Error("Geçersiz rol.");
  if (profileId === session.userId && role !== "admin") {
    throw new Error("Kendi admin yetkinizi kaldıramazsınız.");
  }
  const { error } = await supabase
    .from("profiles")
    .update({ role })
    .eq("id", profileId);
  if (error) throw new Error(error.message);
  revalidatePath("/admin/team");
}

export async function updateLead(formData: FormData) {
  const session = await requireAdminSession(["admin", "doctor", "assistant"]);
  const supabase = await createClient();
  const leadId = text(formData, "lead_id");
  const contactId = text(formData, "contact_id");
  const stage = text(formData, "stage") as LeadStage;

  const { data: previous } = await supabase
    .from("leads")
    .select("stage")
    .eq("id", leadId)
    .single();

  const { error: contactError } = await supabase
    .from("contacts")
    .update({ name: optionalText(formData, "name") })
    .eq("id", contactId);
  if (contactError) throw new Error(contactError.message);

  const { error } = await supabase
    .from("leads")
    .update({
      stage,
      assigned_to: optionalText(formData, "assigned_to"),
      notes: optionalText(formData, "notes"),
    })
    .eq("id", leadId);
  if (error) throw new Error(error.message);

  if (previous?.stage !== stage) {
    const { error: historyError } = await supabase
      .from("lead_status_history")
      .insert({
        lead_id: leadId,
        from_stage: previous?.stage ?? null,
        to_stage: stage,
        changed_by: session.userId,
      });
    if (historyError) throw new Error(historyError.message);
  }

  revalidatePath("/admin/leads");
  revalidatePath(`/admin/leads/${leadId}`);
  revalidatePath("/admin/calendar");
}

export async function createTask(formData: FormData) {
  await requireAdminSession(["admin", "doctor", "assistant"]);
  const supabase = await createClient();
  const leadId = text(formData, "lead_id");
  const { error } = await supabase.from("tasks").insert({
    lead_id: leadId,
    assigned_to: optionalText(formData, "assigned_to"),
    title: text(formData, "title"),
    description: optionalText(formData, "description"),
    due_at: istanbulIso(optionalText(formData, "due_at")),
    priority: text(formData, "priority") || "normal",
  });
  if (error) throw new Error(error.message);
  revalidatePath(`/admin/leads/${leadId}`);
  revalidatePath("/admin/leads");
  revalidatePath("/admin/calendar");
}

export async function toggleTask(formData: FormData) {
  await requireAdminSession(["admin", "doctor", "assistant"]);
  const supabase = await createClient();
  const id = text(formData, "id");
  const leadId = text(formData, "lead_id");
  const complete = checked(formData, "complete");
  const { error } = await supabase
    .from("tasks")
    .update({ completed_at: complete ? new Date().toISOString() : null })
    .eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath(`/admin/leads/${leadId}`);
  revalidatePath("/admin/leads");
  revalidatePath("/admin/calendar");
}

async function ensureLeadId(
  formData: FormData,
  userId: string,
): Promise<string> {
  const supabase = await createClient();
  const existingLeadId = text(formData, "lead_id");
  if (existingLeadId) return existingLeadId;

  const name = text(formData, "name");
  const phoneRaw = text(formData, "phone");
  if (!name || !phoneRaw) {
    throw new Error("Hasta seçin veya ad ile telefon girin.");
  }
  const phone = normalizePhone(phoneRaw);

  const { data: contact, error: contactError } = await supabase
    .from("contacts")
    .upsert({ phone, name }, { onConflict: "phone" })
    .select("id")
    .single();
  if (contactError || !contact) {
    throw new Error(contactError?.message || "Kişi oluşturulamadı.");
  }

  const { data: existing } = await supabase
    .from("leads")
    .select("id")
    .eq("contact_id", contact.id)
    .not("stage", "in", "(won,lost,spam)")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (existing) return existing.id;

  const { data: lead, error } = await supabase
    .from("leads")
    .insert({
      contact_id: contact.id,
      stage: "appointment",
      site: "manual",
      channel: "calendar",
      assigned_to: userId,
      notes: optionalText(formData, "notes"),
    })
    .select("id")
    .single();
  if (error || !lead) {
    throw new Error(error?.message || "Talep oluşturulamadı.");
  }
  return lead.id;
}

function isExclusionViolation(error: {
  code?: string;
  message?: string;
} | null): boolean {
  if (!error) return false;
  return (
    error.code === "23P01" ||
    /appointments_no_overlap|exclusion/i.test(error.message ?? "")
  );
}

function redirectLeadsConflict(
  formData: FormData,
  startsAt: string,
  leadId: string | null | undefined,
  message: string,
): never {
  const params = new URLSearchParams();
  const redirectView = text(formData, "redirect_view");
  if (
    redirectView === "week" ||
    redirectView === "month" ||
    redirectView === "year"
  ) {
    params.set("view", redirectView);
  }
  params.set("date", istanbulYmd(startsAt));
  if (leadId) params.set("lead", leadId);
  params.set("error", message);
  redirect(`/admin/leads?${params.toString()}`);
}

async function slotConflictMessage(
  startsAt: string,
  endsAt: string,
  ignoreId?: string,
): Promise<string | null> {
  const supabase = await createClient();
  const windowStart = new Date(
    new Date(startsAt).getTime() - 12 * 60 * 60 * 1000,
  ).toISOString();
  const windowEnd = new Date(
    new Date(endsAt).getTime() + 12 * 60 * 60 * 1000,
  ).toISOString();
  let query = supabase
    .from("appointments")
    .select("id, starts_at, ends_at, status, title, leads(contacts(name))")
    .neq("status", "cancelled")
    .gte("starts_at", windowStart)
    .lte("starts_at", windowEnd);
  if (ignoreId) query = query.neq("id", ignoreId);
  const { data, error } = await query;
  if (error) throw new Error(error.message);
  const overlaps = findOverlappingAppointments(
    data ?? [],
    startsAt,
    endsAt,
    ignoreId,
  );
  if (!overlaps.length) return null;
  const first = overlaps[0];
  const lead = Array.isArray(first.leads) ? first.leads[0] : first.leads;
  const contact = Array.isArray(lead?.contacts)
    ? lead.contacts[0]
    : lead?.contacts;
  return `Bu saat dolu: ${formatTimeTr(first.starts_at)}–${formatTimeTr(
    appointmentEndIso(first.starts_at, first.ends_at),
  )}${contact?.name ? ` · ${contact.name}` : ""}. Başka bir saat seçin.`;
}

export async function createAppointment(formData: FormData): Promise<{
  ok: boolean;
  error?: string;
  date?: string;
}> {
  try {
    const session = await requireAdminSession(["admin", "doctor", "assistant"]);
    const supabase = await createClient();
    const leadId = await ensureLeadId(formData, session.userId);
    const startsAt = appointmentStartsAt(formData);
    if (!startsAt) {
      return { ok: false, error: "Başlangıç zamanı zorunludur." };
    }
    const durationMinutes = Number(text(formData, "duration_minutes") || 0);
    let endsAt = istanbulIso(optionalText(formData, "ends_at"));
    if (startsAt && durationMinutes > 0) {
      endsAt = new Date(
        new Date(startsAt).getTime() + durationMinutes * 60 * 1000,
      ).toISOString();
    } else if (!endsAt && startsAt) {
      endsAt = new Date(
        new Date(startsAt).getTime() + 30 * 60 * 1000,
      ).toISOString();
    }
    const conflict = await slotConflictMessage(
      startsAt,
      endsAt ?? appointmentEndIso(startsAt),
    );
    if (conflict) {
      return { ok: false, error: conflict, date: istanbulYmd(startsAt) };
    }
    const appointmentType =
      text(formData, "appointment_type") || "consultation";
    const { error } = await supabase.from("appointments").insert({
      lead_id: leadId,
      title: text(formData, "title") || titleFromType(appointmentType),
      starts_at: startsAt,
      ends_at: endsAt,
      notes: optionalText(formData, "notes"),
      status: text(formData, "status") || "scheduled",
      appointment_type: appointmentType,
      location: optionalText(formData, "location"),
      all_day: checked(formData, "all_day"),
      reminder_minutes_before: Number(
        text(formData, "reminder_minutes_before") || 1440,
      ),
      created_by: session.userId,
    });
    if (error) {
      if (isExclusionViolation(error)) {
        return {
          ok: false,
          error: "Bu saat dolu. Başka bir saat seçin.",
          date: istanbulYmd(startsAt),
        };
      }
      return { ok: false, error: error.message };
    }
    await supabase
      .from("leads")
      .update({ stage: "appointment" })
      .eq("id", leadId)
      .in("stage", ["new", "contacted", "qualified"]);
    revalidatePath(`/admin/leads/${leadId}`);
    revalidatePath("/admin/leads");
    revalidatePath("/admin/calendar");
    return { ok: true, date: istanbulYmd(startsAt) };
  } catch (error) {
    unstable_rethrow(error);
    return {
      ok: false,
      error:
        error instanceof Error ? error.message : "Randevu eklenemedi.",
    };
  }
}

export async function updateAppointmentStatus(formData: FormData) {
  await requireAdminSession(["admin", "doctor", "assistant"]);
  const supabase = await createClient();
  const id = text(formData, "id");
  const status = text(formData, "status");
  const { error } = await supabase
    .from("appointments")
    .update({
      status,
      cancelled_at: status === "cancelled" ? new Date().toISOString() : null,
    })
    .eq("id", id);
  if (error) {
    if (isExclusionViolation(error)) {
      throw new Error("Bu saat dolu. Başka bir saat seçin.");
    }
    throw new Error(error.message);
  }
  revalidatePath("/admin/calendar");
  revalidatePath("/admin/leads");
}

export async function updateAppointment(formData: FormData) {
  await requireAdminSession(["admin", "doctor", "assistant"]);
  const supabase = await createClient();
  const id = text(formData, "id");
  const leadId = text(formData, "lead_id");
  const startsAt = appointmentStartsAt(formData);
  const status = text(formData, "status") || "scheduled";
  if (!id || !leadId || !startsAt) {
    throw new Error("Randevu, hasta ve başlangıç zamanı zorunludur.");
  }
  const durationMinutes = Number(text(formData, "duration_minutes") || 0);
  let endsAt = istanbulIso(optionalText(formData, "ends_at"));
  if (durationMinutes > 0) {
    endsAt = new Date(
      new Date(startsAt).getTime() + durationMinutes * 60 * 1000,
    ).toISOString();
  } else if (!endsAt) {
    endsAt = appointmentEndIso(startsAt);
  }
  if (status !== "cancelled") {
    const conflict = await slotConflictMessage(startsAt, endsAt, id);
    if (conflict) {
      redirect(`/admin/calendar/${id}?error=${encodeURIComponent(conflict)}`);
    }
  }
  const appointmentType =
    text(formData, "appointment_type") || "consultation";
  const { error } = await supabase
    .from("appointments")
    .update({
      lead_id: leadId,
      title: text(formData, "title") || titleFromType(appointmentType),
      starts_at: startsAt,
      ends_at: endsAt,
      status,
      appointment_type: appointmentType,
      notes: optionalText(formData, "notes"),
      cancelled_at: status === "cancelled" ? new Date().toISOString() : null,
    })
    .eq("id", id);
  if (error) {
    if (isExclusionViolation(error)) {
      redirect(
        `/admin/calendar/${id}?error=${encodeURIComponent("Bu saat dolu. Başka bir saat seçin.")}`,
      );
    }
    throw new Error(error.message);
  }
  revalidatePath("/admin/calendar");
  revalidatePath(`/admin/calendar/${id}`);
  revalidatePath(`/admin/leads/${leadId}`);
  revalidatePath("/admin/leads");
}

export async function deleteAppointment(formData: FormData) {
  await requireAdminSession(["admin", "doctor", "assistant"]);
  const supabase = await createClient();
  const id = text(formData, "id");
  if (!id) throw new Error("Randevu bulunamadı.");
  const { error } = await supabase.from("appointments").delete().eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/admin/calendar");
  revalidatePath(`/admin/calendar/${id}`);
  revalidatePath("/admin/leads");
  redirect("/admin/leads");
}

export async function sendConversationMessage(formData: FormData) {
  const session = await requireAdminSession(["admin", "doctor", "assistant"]);
  const supabase = await createClient();
  const conversationId = text(formData, "conversation_id");
  const phone = text(formData, "phone");
  const body = text(formData, "body");
  if (!body) return;

  const { data: conversation } = await supabase
    .from("conversations")
    .select("locked_by, locked_at")
    .eq("id", conversationId)
    .single();
  if (
    conversation?.locked_by &&
    conversation.locked_by !== session.userId &&
    isConversationLockFresh(conversation.locked_at)
  ) {
    throw new Error("Bu konuşma başka bir kullanıcı tarafından işleniyor.");
  }
  const { data: lastInbound } = await supabase
    .from("messages")
    .select("created_at")
    .eq("conversation_id", conversationId)
    .eq("direction", "inbound")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (!isWhatsAppServiceWindowOpen(lastInbound?.created_at)) {
    throw new Error(
      "24 saatlik müşteri hizmeti penceresi kapalı; şablon mesaj gerekir.",
    );
  }

  const response = await sendWhatsAppText(phone, body);
  const { error } = await supabase.from("messages").insert({
    conversation_id: conversationId,
    wa_message_id: response.messageId,
    direction: "outbound",
    body,
    status: "sent",
    sent_by: session.userId,
    automated: false,
  });
  if (error) throw new Error(error.message);

  await supabase
    .from("conversations")
    .update({ last_message_at: new Date().toISOString() })
    .eq("id", conversationId);

  revalidatePath("/admin/inbox");
  revalidatePath(`/admin/inbox/${conversationId}`);
}

export async function claimConversation(formData: FormData) {
  const session = await requireAdminSession(["admin", "doctor", "assistant"]);
  const supabase = await createClient();
  const conversationId = text(formData, "conversation_id");
  const { data: conversation } = await supabase
    .from("conversations")
    .select("locked_by, locked_at")
    .eq("id", conversationId)
    .single();
  const lockIsFresh =
    conversation?.locked_at &&
    Date.now() - new Date(conversation.locked_at).getTime() <
      15 * 60 * 1000;
  if (
    lockIsFresh &&
    conversation?.locked_by &&
    conversation.locked_by !== session.userId
  ) {
    throw new Error("Bu konuşma başka bir kullanıcı tarafından işleniyor.");
  }
  const { error } = await supabase
    .from("conversations")
    .update({
      locked_by: session.userId,
      locked_at: new Date().toISOString(),
    })
    .eq("id", conversationId);
  if (error) throw new Error(error.message);
  revalidatePath(`/admin/inbox/${conversationId}`);
}

export async function releaseConversation(formData: FormData) {
  const session = await requireAdminSession(["admin", "doctor", "assistant"]);
  const supabase = await createClient();
  const conversationId = text(formData, "conversation_id");
  let query = supabase
    .from("conversations")
    .update({ locked_by: null, locked_at: null })
    .eq("id", conversationId);
  if (session.role !== "admin") {
    query = query.eq("locked_by", session.userId);
  }
  const { error } = await query;
  if (error) throw new Error(error.message);
  revalidatePath(`/admin/inbox/${conversationId}`);
}

export async function sendConversationTemplate(formData: FormData) {
  const session = await requireAdminSession(["admin", "doctor", "assistant"]);
  const supabase = await createClient();
  const conversationId = text(formData, "conversation_id");
  const phone = text(formData, "phone");
  const templateName = text(formData, "template_name");
  const languageCode = text(formData, "language_code") || "tr";
  if (!templateName) throw new Error("Şablon adı zorunludur.");

  const { data: conversation } = await supabase
    .from("conversations")
    .select("locked_by, locked_at")
    .eq("id", conversationId)
    .single();
  if (
    conversation?.locked_by &&
    conversation.locked_by !== session.userId &&
    isConversationLockFresh(conversation.locked_at)
  ) {
    throw new Error("Bu konuşma başka bir kullanıcı tarafından işleniyor.");
  }

  const response = await sendWhatsAppTemplate(
    phone,
    templateName,
    languageCode,
  );
  const { error } = await supabase.from("messages").insert({
    conversation_id: conversationId,
    wa_message_id: response.messageId,
    direction: "outbound",
    body: `[Şablon: ${templateName}]`,
    status: "sent",
    sent_by: session.userId,
    automated: false,
    raw_payload: { template_name: templateName, language_code: languageCode },
  });
  if (error) throw new Error(error.message);
  await supabase
    .from("conversations")
    .update({ last_message_at: new Date().toISOString() })
    .eq("id", conversationId);
  revalidatePath(`/admin/inbox/${conversationId}`);
}

export async function saveBotSettings(formData: FormData) {
  const session = await requireAdminSession(["admin"]);
  const supabase = await createClient();
  const days = formData
    .getAll("business_days")
    .map((value) => Number(value))
    .filter((value) => Number.isInteger(value));

  const { error } = await supabase
    .from("bot_settings")
    .update({
      enabled: checked(formData, "enabled"),
      business_days: days,
      business_start: text(formData, "business_start"),
      business_end: text(formData, "business_end"),
      welcome_message: text(formData, "welcome_message"),
      after_hours_message: text(formData, "after_hours_message"),
      fallback_message: text(formData, "fallback_message"),
      updated_by: session.userId,
    })
    .eq("id", true);
  if (error) throw new Error(error.message);
  revalidatePath("/admin/bot");
}

export async function saveBotFaq(formData: FormData) {
  const session = await requireAdminSession(["admin", "editor"]);
  const supabase = await createClient();
  const id = text(formData, "id");
  const keywords = text(formData, "keywords")
    .split(",")
    .map((keyword) => keyword.trim().toLocaleLowerCase("en-US"))
    .filter(Boolean);

  const payload = {
    question: text(formData, "question"),
    answer: text(formData, "answer"),
    keywords,
    enabled: checked(formData, "enabled"),
    sort_order: Number(text(formData, "sort_order") || 0),
  };

  const result = id
    ? await supabase.from("bot_faqs").update(payload).eq("id", id)
    : await supabase
        .from("bot_faqs")
        .insert({ ...payload, created_by: session.userId });
  if (result.error) throw new Error(result.error.message);
  revalidatePath("/admin/bot");
}

export async function deleteBotFaq(formData: FormData) {
  await requireAdminSession(["admin", "editor"]);
  const supabase = await createClient();
  const { error } = await supabase
    .from("bot_faqs")
    .delete()
    .eq("id", text(formData, "id"));
  if (error) throw new Error(error.message);
  revalidatePath("/admin/bot");
}

