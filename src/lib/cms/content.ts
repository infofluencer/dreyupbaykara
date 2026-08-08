import "server-only";

import { createClient } from "@supabase/supabase-js";

export type PublicContentSection = {
  id: string;
  section_key: string;
  section_type: string;
  title: string | null;
  content: Record<string, unknown>;
  sort_order: number;
};

export type PublicContentPage = {
  id: string;
  slug: string;
  title: string;
  excerpt: string | null;
  featured_image_path: string | null;
  featured_image_alt: string | null;
  seo_title: string | null;
  seo_description: string | null;
  canonical_url: string | null;
  published_at: string | null;
  content_sections: PublicContentSection[];
};

function publicClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return null;
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export async function getPublishedPage(
  slug: string,
): Promise<PublicContentPage | null> {
  const supabase = publicClient();
  if (!supabase) return null;
  const { data } = await supabase
    .from("content_pages")
    .select(
      "id, slug, title, excerpt, featured_image_path, featured_image_alt, seo_title, seo_description, canonical_url, published_at, content_sections(id, section_key, section_type, title, content, sort_order)",
    )
    .eq("slug", slug)
    .eq("status", "published")
    .eq("content_sections.is_visible", true)
    .order("sort_order", {
      referencedTable: "content_sections",
      ascending: true,
    })
    .maybeSingle();
  return (data as PublicContentPage | null) ?? null;
}

export async function getPublishedPagesByType(
  pageType: "blog" | "treatment" | "experience" | "page" | "home",
): Promise<PublicContentPage[]> {
  const supabase = publicClient();
  if (!supabase) return [];
  const { data } = await supabase
    .from("content_pages")
    .select(
      "id, slug, title, excerpt, featured_image_path, featured_image_alt, seo_title, seo_description, canonical_url, published_at, content_sections(id, section_key, section_type, title, content, sort_order)",
    )
    .eq("page_type", pageType)
    .eq("status", "published")
    .eq("content_sections.is_visible", true)
    .order("published_at", { ascending: false })
    .order("sort_order", {
      referencedTable: "content_sections",
      ascending: true,
    });
  return (data as PublicContentPage[] | null) ?? [];
}

export function mediaPublicUrl(path: string | null | undefined): string | null {
  if (!path) return null;
  if (
    path.startsWith("http://") ||
    path.startsWith("https://") ||
    path.startsWith("/")
  ) {
    return path;
  }
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  return url
    ? `${url}/storage/v1/object/public/site-media/${path
        .split("/")
        .map(encodeURIComponent)
        .join("/")}`
    : null;
}

export async function getPublicSettings(
  keys: string[],
): Promise<Record<string, unknown>> {
  const supabase = publicClient();
  if (!supabase) return {};
  const { data } = await supabase
    .from("site_settings")
    .select("setting_key, value")
    .in("setting_key", keys)
    .eq("is_public", true);
  return Object.fromEntries(
    (data ?? []).map((item) => [item.setting_key, item.value]),
  );
}

