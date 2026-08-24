import "server-only";

import { cache } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { UserRole } from "@/types/crm";

export type AdminSession = {
  userId: string;
  email: string | null;
  role: UserRole;
};

/**
 * Request-scoped getUser + profiles lookup.
 * Kept argument-free so React cache() hits even when callers pass
 * different allowedRoles array literals (Object.is on args).
 */
const readAdminSession = cache(async (): Promise<AdminSession> => {
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
  if (!role) {
    redirect("/admin/login?error=yetkisiz");
  }

  return {
    userId: user.id,
    email: user.email ?? null,
    role,
  };
});

export async function requireAdminSession(
  allowedRoles?: UserRole[],
): Promise<AdminSession> {
  const session = await readAdminSession();
  if (allowedRoles && !allowedRoles.includes(session.role)) {
    redirect("/admin?error=yetkisiz");
  }
  return session;
}
