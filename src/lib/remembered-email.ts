const key = "collection-identification-email";
type EmailStorage = Pick<Storage, "getItem" | "setItem">;

export function readRememberedEmail(storage: EmailStorage): string {
  try { return storage.getItem(key) ?? ""; } catch { return ""; }
}

export function rememberEmail(storage: EmailStorage, email: string): string {
  const value = email.trim();
  try { storage.setItem(key, value); } catch { /* Sign-in works even when storage is unavailable. */ }
  return value;
}