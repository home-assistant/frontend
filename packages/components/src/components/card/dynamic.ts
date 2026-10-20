import { createDynamicLoader } from "../../utils/dynamic";
import { VERSION } from "./version";

/**
 * Registers <hac-card> in a scoped registry, using Home Assistant's copy when
 * its version is compatible and the bundled one otherwise:
 * `ScopedElementsMixin(LitElement, { ...hacCardElements })` or
 * `createScopedElementRegistry({ ...hacCardElements })`.
 *
 * Only the version is imported up front; the bundled component is loaded
 * when it is needed.
 */
export const hacCardElements = {
  "hac-card": createDynamicLoader("hac-card", VERSION, () =>
    import("./hac-card").then((m) => m.HacCard)
  ),
};
