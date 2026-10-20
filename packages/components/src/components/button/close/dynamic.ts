import { createDynamicLoader } from "../../../utils/dynamic";
import { VERSION } from "./version";

/**
 * Registers <hac-button-close> in a scoped registry, using Home Assistant's copy when
 * its version is compatible and the bundled one otherwise:
 * `ScopedElementsMixin(LitElement, { ...hacButtonCloseElements })` or
 * `createScopedElementRegistry({ ...hacButtonCloseElements })`.
 *
 * Only the version is imported up front; the bundled component is loaded
 * when it is needed.
 */
export const hacButtonCloseElements = {
  "hac-button-close": createDynamicLoader("hac-button-close", VERSION, () =>
    import("./hac-button-close").then((m) => m.HacButtonClose)
  ),
};
