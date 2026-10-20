import { createDynamicLoader } from "../../utils/registration/dynamic";
import { VERSION } from "./version";

/**
 * The bundled <hac-card> from the scoped entry point. Loaded only when Home
 * Assistant cannot provide a compatible copy.
 */
const loadScoped = async () =>
  (await import("./scoped")).hacCardElements["hac-card"];

/**
 * Registers <hac-card> in a scoped registry, using Home Assistant's copy when
 * its version is compatible and the bundled one otherwise:
 * `ScopedElementsMixin(LitElement, { ...hacCardElements })` or
 * `createScopedElementRegistry({ ...hacCardElements })`.
 */
export const hacCardElements = {
  "hac-card": createDynamicLoader("hac-card", VERSION, loadScoped),
};
