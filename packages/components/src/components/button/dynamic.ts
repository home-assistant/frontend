import type { ElementDefinition } from "../../utils/registration/definition";
import { createDynamicLoader } from "../../utils/registration/dynamic";
import { TAG_NAME, VERSION } from "./info";

/**
 * The bundled <hac-button> from the scoped entry point. Loaded only when Home
 * Assistant cannot provide a compatible copy.
 */
const loadScoped = async () => (await import("./scoped")).hacButton.element;

/**
 * <hac-button> for a scoped registry, using Home Assistant's copy when its version
 * is compatible and the bundled one otherwise:
 * `ScopedElementsMixin(LitElement, [hacButton])` or
 * `createScopedElementRegistry([hacButton])`.
 */
export const hacButton: ElementDefinition = {
  tagName: TAG_NAME,
  element: createDynamicLoader(TAG_NAME, VERSION, loadScoped),
};
