import { createDynamicLoader } from "../../utils/dynamic";
import { HacButton } from "./hac-button";
import { HacButtonClose } from "./hac-button-close";

export { HacButton, HacButtonClose };

/**
 * Registers the button group in a scoped registry, using Home Assistant's
 * copies when their version is compatible and the bundled ones otherwise:
 * `ScopedElementsMixin(LitElement, { ...hacButtonElements })` or
 * `createScopedElementRegistry({ ...hacButtonElements })`.
 */
export const hacButtonElements = {
  "hac-button": createDynamicLoader("hac-button", HacButton),
  "hac-button-close": createDynamicLoader("hac-button-close", HacButtonClose),
};
