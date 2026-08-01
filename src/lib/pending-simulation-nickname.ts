const SAVED_NICKNAME_KEY = "beginner-simulation-nickname";
const PENDING_NICKNAME_KEY = "beginner-pending-profile-nickname";

function normalizeNickname(value: string) {
  return value.trim().slice(0, 30);
}

export function getSavedSimulationNickname() {
  if (typeof window === "undefined") return "";
  return normalizeNickname(window.localStorage.getItem(SAVED_NICKNAME_KEY) ?? "");
}

export function getPendingProfileNickname() {
  if (typeof window === "undefined") return "";
  return normalizeNickname(window.localStorage.getItem(PENDING_NICKNAME_KEY) ?? "");
}

export function saveSimulationNickname(value: string) {
  const nickname = normalizeNickname(value);
  if (!nickname || typeof window === "undefined") return "";

  window.localStorage.setItem(SAVED_NICKNAME_KEY, nickname);
  window.localStorage.setItem(PENDING_NICKNAME_KEY, nickname);
  window.dispatchEvent(new CustomEvent<string>("beginner:guest-nickname-updated", { detail: nickname }));
  return nickname;
}

export function clearPendingProfileNickname() {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(PENDING_NICKNAME_KEY);
}
