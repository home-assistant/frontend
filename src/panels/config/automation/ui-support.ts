import { handleStructError } from "../../../common/structs/handle-errors";
import type { LocalizeFunc } from "../../../common/translations/localize";

/**
 * Optional static method on trigger, condition and action editor elements.
 * Returns an error when the given config cannot be edited in the visual editor.
 * It must be synchronous and must not depend on element state, so it can be
 * called for configs that are only edited in YAML.
 */
export type CheckUiSupport<T = any> = (
  localize: LocalizeFunc,
  config: T
) => Error | undefined;

interface ElementWithUiSupportCheck extends CustomElementConstructor {
  checkUiSupport?: CheckUiSupport;
}

export const checkElementUiSupport = (
  localize: LocalizeFunc,
  elementName: string,
  config: unknown
): Error | undefined =>
  (
    customElements.get(elementName) as ElementWithUiSupportCheck | undefined
  )?.checkUiSupport?.(localize, config);

/**
 * Warnings to show when the config can't be edited in the visual editor,
 * or `undefined` when it can.
 */
export const getUiSupportWarnings = (
  localize: LocalizeFunc,
  elementName: string,
  config: unknown
): string[] | undefined => {
  const err = checkElementUiSupport(localize, elementName, config);
  return err ? handleStructError(localize, err).warnings : undefined;
};
