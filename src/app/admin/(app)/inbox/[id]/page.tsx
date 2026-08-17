import { redirect } from "next/navigation";

export default async function AdminInboxConversationRedirect({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  redirect(`/admin/messages?c=${id}`);
}
