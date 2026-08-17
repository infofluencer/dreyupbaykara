import { redirect } from "next/navigation";

/** Legacy path — yeni inbox: /admin/messages */
export default async function AdminInboxRedirect({
  searchParams,
}: {
  searchParams: Promise<{ lead?: string }>;
}) {
  const query = await searchParams;
  if (query.lead) {
    redirect(`/admin/messages?lead=${query.lead}`);
  }
  redirect("/admin/messages");
}
