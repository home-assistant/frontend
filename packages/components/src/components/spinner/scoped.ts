import type { ElementDefinition } from "../../utils/registration/definition";
import { HacSpinner } from "./hac-spinner";
import { TAG_NAME } from "./info";

export { HacSpinner };

/**
 * The bundled <hac-spinner> for a scoped registry:
 * `ScopedElementsMixin(LitElement, [hacSpinner])` or
 * `createScopedElementRegistry([hacSpinner])`.
 */
export const hacSpinner: ElementDefinition<typeof HacSpinner> = {
  tagName: TAG_NAME,
  element: HacSpinner,
};
