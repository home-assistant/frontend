/**
 * Returns `baseSlug` if it is not in `taken`, otherwise `baseSlug-2`, `baseSlug-3`, …
 */
export function pickAvailableDashboardUrlPath(
  baseSlug: string,
  taken: ReadonlySet<string>
): string {
  if (!taken.has(baseSlug)) {
    return baseSlug;
  }
  let n = 2;
  while (taken.has(`${baseSlug}-${n}`)) {
    n += 1;
  }
  return `${baseSlug}-${n}`;
}
