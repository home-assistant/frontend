import { scopedVariant } from "../../utils/dependencies";
import { HacCard } from "./hac-card";

export { HacCard };

/**
 * Registers the bundled <hac-card> in a scoped registry:
 * `ScopedElementsMixin(LitElement, { ...hacCardElements })` or
 * `createScopedElementRegistry({ ...hacCardElements })`.
 */
export const hacCardElements = { "hac-card": scopedVariant(HacCard) };
