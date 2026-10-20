import { createDynamicLoader } from "../../utils/dynamic";
import { HacButton } from "./hac-button";

export { HacButton };

/**
 * Registers <hac-button> in a scoped registry, using Home Assistant's copy
 * when its version is compatible and the bundled one otherwise:
 * `ScopedElementsMixin(LitElement, { ...hacButtonElements })` or
 * `createScopedElementRegistry({ ...hacButtonElements })`.
 */
export const hacButtonElements = {
  "hac-button": createDynamicLoader("hac-button", HacButton),
};
