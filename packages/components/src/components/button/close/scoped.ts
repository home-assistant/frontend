import { scopedVariant } from "../../../utils/registration/dependencies";
import { HacButtonClose } from "./hac-button-close";

export { HacButtonClose };

/**
 * Registers the bundled <hac-button-close> in a scoped registry:
 * `ScopedElementsMixin(LitElement, { ...hacButtonCloseElements })` or
 * `createScopedElementRegistry({ ...hacButtonCloseElements })`.
 */
export const hacButtonCloseElements = {
  "hac-button-close": scopedVariant(HacButtonClose),
};
