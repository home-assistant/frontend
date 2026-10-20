import { createDynamicLoader } from "../../../utils/registration/dynamic";
import { VERSION } from "./version";

/**
 * The bundled <hac-button-close> from the scoped entry point. Loaded only
 * when Home Assistant cannot provide a compatible copy.
 */
const loadScoped = async () =>
  (await import("./scoped")).hacButtonCloseElements["hac-button-close"];

/**
 * Registers <hac-button-close> in a scoped registry, using Home Assistant's
 * copy when its version is compatible and the bundled one otherwise:
 * `ScopedElementsMixin(LitElement, { ...hacButtonCloseElements })` or
 * `createScopedElementRegistry({ ...hacButtonCloseElements })`.
 */
export const hacButtonCloseElements = {
  "hac-button-close": createDynamicLoader(
    "hac-button-close",
    VERSION,
    loadScoped
  ),
};
