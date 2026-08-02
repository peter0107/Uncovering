import type { User } from "@supabase/supabase-js";

export function isAdminUser(user: User | null | undefined): boolean {
  return user?.app_metadata?.role === "admin";
}

export function getPostLoginPath(_email: string | null | undefined, redirect: string): string {
  return redirect === "/" ? "/start" : redirect;
}