const STORAGE_KEY = "ibrowse_temp_user_id";

export function resolveTemporaryUserId() {
  const url = new URL(window.location.href);
  const tempUserId = url.searchParams.get("temp_user_id");

  if (tempUserId) {
    window.localStorage.setItem(STORAGE_KEY, tempUserId);
    return tempUserId;
  }

  return window.localStorage.getItem(STORAGE_KEY);
}
