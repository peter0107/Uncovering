import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const SENSITIVE_SEARCH_PARAMS = ["code", "token"];

/** 체험 코드·검수 토큰 등이 애널리틱스(PostHog/GA)로 그대로 새지 않게 쿼리에서 지운다. */
export function stripSensitiveSearchParams(href: string): string {
  try {
    const url = new URL(href);
    for (const key of SENSITIVE_SEARCH_PARAMS) url.searchParams.delete(key);
    return url.toString();
  } catch {
    return href;
  }
}
