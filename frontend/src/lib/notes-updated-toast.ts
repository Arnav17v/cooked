/** Dispatched when prep notes gain new weak sections (e.g. after a quiz). */
export const NOTES_UPDATED_TOAST_EVENT = "cooked-notes-updated";

export function showNotesUpdatedToast(): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(NOTES_UPDATED_TOAST_EVENT));
}
