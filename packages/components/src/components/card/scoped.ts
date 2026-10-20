import type { HacElementDefinition } from "../../utils/registration/definition";
import { scopedVariant } from "../../utils/registration/dependencies";
import { HacCard } from "./hac-card";
import { TAG_NAME } from "./info";

export { HacCard };

/**
 * The bundled <hac-card> for a scoped registry:
 * `ScopedElementsMixin(LitElement, [hacCard])` or
 * `createScopedElementRegistry([hacCard])`.
 */
export const hacCard: HacElementDefinition<typeof HacCard> = {
  tagName: TAG_NAME,
  element: scopedVariant(HacCard),
};
