import { createDynamicLoader } from "../../utils/dynamic";
import { VERSION } from "./version";

/**
 * The bundled <hac-header> from the scoped entry point. Loaded only when Home
 * Assistant cannot provide a compatible copy.
 */
const loadScoped = async () =>
  (await import("./scoped")).hacHeaderElements["hac-header"];

/**
 * Registers <hac-header> in a scoped registry, using Home Assistant's copy when
 * its version is compatible and the bundled one otherwise:
 * `ScopedElementsMixin(LitElement, { ...hacHeaderElements })` or
 * `createScopedElementRegistry({ ...hacHeaderElements })`.
 */
export const hacHeaderElements = {
  "hac-header": createDynamicLoader("hac-header", VERSION, loadScoped),
};
