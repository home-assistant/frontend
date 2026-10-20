import { createDynamicLoader } from "../../utils/dynamic";
import { VERSION } from "./version";

/**
 * Registers <hac-button> in a scoped registry, using Home Assistant's copy when
 * its version is compatible and the bundled one otherwise:
 * `ScopedElementsMixin(LitElement, { ...hacButtonElements })` or
 * `createScopedElementRegistry({ ...hacButtonElements })`.
 *
 * Only the version is imported up front; the bundled component is loaded
 * when it is needed.
 */
export const hacButtonElements = {
  "hac-button": createDynamicLoader("hac-button", VERSION, () =>
    import("./hac-button").then((m) => m.HacButton)
  ),
};
