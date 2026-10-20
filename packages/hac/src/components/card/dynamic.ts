import { createDynamicLoader } from "../../utils/dynamic";
import { HacCard } from "./hac-card";

export { HacCard };

/**
 * Registers <hac-card> in a scoped registry, using Home Assistant's copy when
 * its version is compatible and the bundled one otherwise:
 * `ScopedElementsMixin(LitElement, { ...hacCardElements })` or
 * `createScopedElementRegistry({ ...hacCardElements })`.
 */
export const hacCardElements = {
  "hac-card": createDynamicLoader("hac-card", HacCard),
};
