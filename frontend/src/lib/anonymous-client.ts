const STORAGE_KEY = "cooked_anon_client_id";

/** Stable per-browser id for anonymous resume uploads (sent as `X-Cooked-Anonymous-Id`). */
export function getOrCreateAnonymousClientId(): string {
  if (typeof window === "undefined") {
    return "";
  }
  let id = localStorage.getItem(STORAGE_KEY)?.trim();
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem(STORAGE_KEY, id);
  }
  return id;
}
