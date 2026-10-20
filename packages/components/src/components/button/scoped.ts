import type { HacElementDefinition } from "../../utils/registration/definition";
import { scopedVariant } from "../../utils/registration/dependencies";
import { HacButton } from "./hac-button";
import { TAG_NAME } from "./info";

export { HacButton };

/**
 * The bundled <hac-button> for a scoped registry:
 * `ScopedElementsMixin(LitElement, [hacButton])` or
 * `createScopedElementRegistry([hacButton])`.
 */
export const hacButton: HacElementDefinition<typeof HacButton> = {
  tagName: TAG_NAME,
  element: scopedVariant(HacButton),
};
