import { HacHeader } from "./hac-header";

export { HacHeader };

/**
 * Registers the bundled <hac-header> in a scoped registry:
 * `static scopedElements = { ...hacHeaderElements }` with `ScopedElementsMixin`.
 */
export const hacHeaderElements = { "hac-header": HacHeader };
