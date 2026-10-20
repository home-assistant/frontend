import { scopedVariant } from "../../utils/dependencies";
import { HacButton } from "./hac-button";
import { HacButtonClose } from "./hac-button-close";

export { HacButton, HacButtonClose };

/**
 * Registers the bundled button group in a scoped registry:
 * `ScopedElementsMixin(LitElement, { ...hacButtonElements })` or
 * `createScopedElementRegistry({ ...hacButtonElements })`.
 */
export const hacButtonElements = {
  "hac-button": scopedVariant(HacButton),
  "hac-button-close": scopedVariant(HacButtonClose),
};
