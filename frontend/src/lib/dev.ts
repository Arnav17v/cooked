/** Matches backend ``DEV=1`` — set ``NEXT_PUBLIC_DEV=1`` in ``frontend/.env``. */
export function isDevMode(): boolean {
  return process.env.NEXT_PUBLIC_DEV?.trim() === "1";
}
