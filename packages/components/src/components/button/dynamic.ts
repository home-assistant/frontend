import { createDynamicLoader } from "../../utils/registration/dynamic";
import { VERSION } from "./version";

/**
 * The bundled <hac-button> from the scoped entry point. Loaded only when Home
 * Assistant cannot provide a compatible copy.
 */
const loadScoped = async () =>
  (await import("./scoped")).hacButtonElements["hac-button"];

/**
 * Registers <hac-button> in a scoped registry, using Home Assistant's copy when
 * its version is compatible and the bundled one otherwise:
 * `ScopedElementsMixin(LitElement, { ...hacButtonElements })` or
 * `createScopedElementRegistry({ ...hacButtonElements })`.
 */
export const hacButtonElements = {
  "hac-button": createDynamicLoader("hac-button", VERSION, loadScoped),
};
