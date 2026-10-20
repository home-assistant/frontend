import type { HacElementDefinition } from "../../utils/registration/definition";
import { scopedVariant } from "../../utils/registration/dependencies";
import { HacHeader } from "./hac-header";
import { TAG_NAME } from "./info";

export { HacHeader };

/**
 * The bundled <hac-header> for a scoped registry:
 * `ScopedElementsMixin(LitElement, [hacHeader])` or
 * `createScopedElementRegistry([hacHeader])`.
 */
export const hacHeader: HacElementDefinition<typeof HacHeader> = {
  tagName: TAG_NAME,
  element: scopedVariant(HacHeader),
};
