import { redirect } from "next/navigation";

export default function NewLeadRedirect() {
  redirect("/admin/patients/new");
}
