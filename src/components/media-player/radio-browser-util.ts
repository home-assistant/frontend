import type { MediaPlayerItem } from "../../data/media-player";

export const RADIO_BROWSER_MEDIA_SOURCE_PREFIX = "media-source://radio_browser";

/**
 * Filters a list of media items by title for the Radio Browser search input.
 * The comparison is case-insensitive.
 */
export function filterRadioBrowserChildren(
  children: MediaPlayerItem[],
  query: string
): MediaPlayerItem[] {
  if (!query) return children;
  const lowerQuery = query.toLowerCase();
  return children.filter((child) =>
    child.title.toLowerCase().includes(lowerQuery)
  );
}
