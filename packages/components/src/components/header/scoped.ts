import { scopedVariant } from "../../utils/registration/dependencies";
import { HacHeader } from "./hac-header";

export { HacHeader };

/**
 * Registers the bundled <hac-header> in a scoped registry:
 * `ScopedElementsMixin(LitElement, { ...hacHeaderElements })` or
 * `createScopedElementRegistry({ ...hacHeaderElements })`.
 */
export const hacHeaderElements = { "hac-header": scopedVariant(HacHeader) };
