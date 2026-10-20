import { HacCard } from "./hac-card";

export { HacCard };

/**
 * Registers the bundled <hac-card> in a scoped registry:
 * `static scopedElements = { ...hacCardElements }` with `ScopedElementsMixin`.
 */
export const hacCardElements = { "hac-card": HacCard };
