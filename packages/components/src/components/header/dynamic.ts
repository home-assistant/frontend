import { createDynamicLoader } from "../../utils/dynamic";
import { VERSION } from "./version";

/**
 * Registers <hac-header> in a scoped registry, using Home Assistant's copy when
 * its version is compatible and the bundled one otherwise:
 * `ScopedElementsMixin(LitElement, { ...hacHeaderElements })` or
 * `createScopedElementRegistry({ ...hacHeaderElements })`.
 *
 * Only the version is imported up front; the bundled component is loaded
 * when it is needed.
 */
export const hacHeaderElements = {
  "hac-header": createDynamicLoader("hac-header", VERSION, () =>
    import("./hac-header").then((m) => m.HacHeader)
  ),
};
