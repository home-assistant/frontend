import { scopedVariant } from "../../utils/registration/dependencies";
import { HacButton } from "./hac-button";

export { HacButton };

/**
 * Registers the bundled <hac-button> in a scoped registry:
 * `ScopedElementsMixin(LitElement, { ...hacButtonElements })` or
 * `createScopedElementRegistry({ ...hacButtonElements })`.
 */
export const hacButtonElements = { "hac-button": scopedVariant(HacButton) };
