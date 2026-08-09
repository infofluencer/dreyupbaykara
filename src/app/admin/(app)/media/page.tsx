import { redirect } from "next/navigation";

export default async function AdminMediaPage({
  searchParams,
}: {
  searchParams: Promise<{
    imported?: string;
    linked?: string;
    failed?: string;
  }>;
}) {
  const query = await searchParams;
  const params = new URLSearchParams({ tab: "media" });
  if (query.imported) params.set("imported", query.imported);
  if (query.linked) params.set("linked", query.linked);
  if (query.failed) params.set("failed", query.failed);
  redirect(`/admin/content?${params.toString()}`);
}
