import type { HacElementDefinition } from "../../utils/registration/definition";
import { createDynamicLoader } from "../../utils/registration/dynamic";
import { TAG_NAME, VERSION } from "./info";

/**
 * The bundled <hac-card> from the scoped entry point. Loaded only when Home
 * Assistant cannot provide a compatible copy.
 */
const loadScoped = async () => (await import("./scoped")).hacCard.element;

/**
 * <hac-card> for a scoped registry, using Home Assistant's copy when its version
 * is compatible and the bundled one otherwise:
 * `ScopedElementsMixin(LitElement, [hacCard])` or
 * `createScopedElementRegistry([hacCard])`.
 */
export const hacCard: HacElementDefinition = {
  tagName: TAG_NAME,
  element: createDynamicLoader(TAG_NAME, VERSION, loadScoped),
};
