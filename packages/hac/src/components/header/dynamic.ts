import { createDynamicLoader } from "../../utils/dynamic";
import { HacHeader } from "./hac-header";

export { HacHeader };

/**
 * Registers <hac-header> in a scoped registry, using Home Assistant's copy when
 * its version is compatible and the bundled one otherwise:
 * `static scopedElements = { ...hacHeaderElements }` with `ScopedElementsMixin`.
 */
export const hacHeaderElements = {
  "hac-header": createDynamicLoader("hac-header", HacHeader),
};
