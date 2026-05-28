/** Open stored quiz analysis in a new tab. */
export function openQuizResultsInNewTab(
  origin: string,
  sessionId: string,
  fallbackSameTab: (path: string) => void,
): void {
  const url = `${origin}/quiz/results/${encodeURIComponent(sessionId)}`;
  const w = window.open(url, "_blank");
  if (w) {
    w.opener = null;
    return;
  }
  fallbackSameTab(`/quiz/results/${sessionId}`);
}
