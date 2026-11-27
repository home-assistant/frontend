/* How tall content was once loaded last time, so its skeleton can hold the
   same space while it loads again. Content wraps differently at other
   widths, so each width is remembered on its own. */

const STORAGE_KEY = "skeletonHeights";

/* Widths this close together share a height */
const WIDTH_STEP = 16;

/* The most recently loaded ones are kept, the oldest dropped: about 20 bytes
   each */
const MAX_HEIGHTS = 500;

let heights: Map<string, number> | undefined;

let saveTimeout: number | undefined;

const readHeights = (): Map<string, number> => {
  const read = new Map<string, number>();

  try {
    const stored: unknown = JSON.parse(
      window.localStorage.getItem(STORAGE_KEY) ?? "{}"
    );

    if (stored instanceof Object && !Array.isArray(stored)) {
      Object.entries(stored).forEach(([key, height]) => {
        if (Number.isFinite(height)) {
          read.set(key, Number(height));
        }
      });
    }
  } catch {
    // Unreadable heights are only lost hints
  }

  return read;
};

const loadHeights = (): Map<string, number> => {
  heights ??= readHeights();

  return heights;
};

const saveHeights = () => {
  saveTimeout = undefined;

  try {
    window.localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify(Object.fromEntries(loadHeights()))
    );
  } catch {
    // Private mode or full storage: the skeleton just won't hold the space
  }
};

const widthKey = (key: string, width: number) =>
  `${key}@${Math.round(width / WIDTH_STEP)}`;

export const rememberedSkeletonHeight = (
  key: string,
  width: number
): number | undefined => loadHeights().get(widthKey(key, width));

export const rememberSkeletonHeight = (
  key: string,
  width: number,
  height: number
) => {
  const stored = loadHeights();
  const entryKey = widthKey(key, width);

  // Moved to the end, as the most recently loaded
  stored.delete(entryKey);
  stored.set(entryKey, Math.round(height));

  while (stored.size > MAX_HEIGHTS) {
    const [oldest] = stored.keys();
    stored.delete(oldest);
  }

  // A view loads many at once, so they're saved together
  if (saveTimeout === undefined) {
    saveTimeout = window.setTimeout(saveHeights, 1000);
  }
};

/* A short, stable key for a longer text, such as a card's config as JSON */
export const skeletonKey = (text: string): string => {
  let hash = 5381;

  for (let i = 0; i < text.length; i++) {
    hash = (hash * 33 + text.charCodeAt(i)) % 2147483647;
  }

  return `${hash.toString(36)}${text.length.toString(36)}`;
};
