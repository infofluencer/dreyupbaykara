import "server-only";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { UserRole } from "@/types/crm";

export type AdminSession = {
  userId: string;
  email: string | null;
  role: UserRole;
};

export async function requireAdminSession(
  allowedRoles?: UserRole[],
): Promise<AdminSession> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/admin/login");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  const role = profile?.role as UserRole | undefined;
  if (!role || (allowedRoles && !allowedRoles.includes(role))) {
    redirect("/admin?error=yetkisiz");
  }

  return {
    userId: user.id,
    email: user.email ?? null,
    role,
  };
}

