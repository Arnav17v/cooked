/**
 * Open `/quiz/start` in a new tab. Call only after handoff is written to localStorage.
 *
 * Do not pass `noopener` in `window.open`'s third argument: with that feature string many
 * browsers return `null` even when the tab opened, which would make a same-tab fallback
 * run and navigate the dashboard away while the new tab also loads.
 */
export function openQuizStartInNewTab(
  origin: string,
  fallbackSameTab: (path: "/quiz/start") => void,
): void {
  const url = `${origin}/quiz/start`;
  const w = window.open(url, "_blank");
  if (w) {
    w.opener = null;
    return;
  }
  fallbackSameTab("/quiz/start");
}
