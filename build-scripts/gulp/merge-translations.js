import merge from "lodash.merge";

const isMergeableObject = (value) =>
  typeof value === "object" && value !== null && !Array.isArray(value);

// Keys that must never be written to, to avoid prototype pollution when the
// overlay comes from an untrusted source (JSON.parse can produce an own
// `__proto__` key from `{"__proto__": ...}`).
const FORBIDDEN_KEYS = new Set(["__proto__", "constructor", "prototype"]);

// Deep-merge `overlay` onto `base`, keeping only keys that already exist as own
// properties of `base`. Overlay keys with no counterpart in the base - e.g.
// translations for source strings that have since been removed from or renamed
// in en.json but still linger in Lokalise - are dropped so we don't ship stale
// keys. `base` is mutated and returned.
export const restrictedMerge = (base, overlay) => {
  for (const key of Object.keys(overlay)) {
    // Own-property check (not `in`) so inherited keys like `__proto__` or
    // `toString` from the overlay are ignored rather than merged.
    if (FORBIDDEN_KEYS.has(key) || !Object.hasOwn(base, key)) {
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
