import merge from "lodash.merge";

const isMergeableObject = (value) =>
  typeof value === "object" && value !== null && !Array.isArray(value);

// Deep-merge `overlay` onto `base`, keeping only keys that already exist in
// `base`. Overlay keys with no counterpart in the base - e.g. translations for
// source strings that have since been removed from or renamed in en.json but
// still linger in Lokalise - are dropped so we don't ship stale keys. `base` is
// mutated and returned.
export const restrictedMerge = (base, overlay) => {
  for (const key of Object.keys(overlay)) {
    if (!(key in base)) {
      continue;
    }
    const baseValue = base[key];
    const overlayValue = overlay[key];
    if (isMergeableObject(baseValue) && isMergeableObject(overlayValue)) {
      restrictedMerge(baseValue, overlayValue);
    } else if (
      !isMergeableObject(baseValue) &&
      !isMergeableObject(overlayValue)
    ) {
      base[key] = overlayValue;
    }
    // Mismatched shapes keep the base (English) value as a safe fallback.
  }
  return base;
};

// Merge translation `objects` onto `startObj`. When `prune` is set, the result
// is restricted to the key shape of `startObj` (the English master), so keys
// that no longer exist in en.json are not shipped. Otherwise keys are merged
// additively (used when building the English master itself, which starts empty).
export const mergeTranslations = (startObj, objects, prune = false) =>
  prune
    ? objects.reduce(restrictedMerge, startObj)
    : merge(startObj, ...objects);
