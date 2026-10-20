import type { ElementDefinition } from "../../../utils/registration/definition";
import { scopedVariant } from "../../../utils/registration/dependencies";
import { HacButtonClose } from "./hac-button-close";
import { TAG_NAME } from "./info";

export { HacButtonClose };

/**
 * The bundled <hac-button-close> for a scoped registry:
 * `ScopedElementsMixin(LitElement, [hacButtonClose])` or
 * `createScopedElementRegistry([hacButtonClose])`.
 */
export const hacButtonClose: ElementDefinition<typeof HacButtonClose> = {
  tagName: TAG_NAME,
  element: scopedVariant(HacButtonClose),
};
