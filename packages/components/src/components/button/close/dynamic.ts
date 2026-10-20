import { createDynamicLoader } from "../../../utils/dynamic";
import { HacButtonClose } from "./hac-button-close";

export { HacButtonClose };

/**
 * Registers <hac-button-close> in a scoped registry, using Home Assistant's
 * copy when its version is compatible and the bundled one otherwise:
 * `ScopedElementsMixin(LitElement, { ...hacButtonCloseElements })` or
 * `createScopedElementRegistry({ ...hacButtonCloseElements })`.
 */
export const hacButtonCloseElements = {
  "hac-button-close": createDynamicLoader("hac-button-close", HacButtonClose),
};
