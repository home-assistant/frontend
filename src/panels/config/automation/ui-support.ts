import { handleStructError } from "../../../common/structs/handle-errors";
import type { HomeAssistant } from "../../../types";

/**
 * Optional static method on trigger, condition and action editor elements.
 * Returns an error when the given config cannot be edited in the visual editor.
 * It must be synchronous and must not depend on element state, so it can be
 * called for configs that are only edited in YAML.
 */
export type CheckUiSupport<T = any> = (
  hass: HomeAssistant,
  config: T
) => Error | undefined;

interface ElementWithUiSupportCheck extends CustomElementConstructor {
  checkUiSupport?: CheckUiSupport;
}

export const checkElementUiSupport = (
  hass: HomeAssistant,
  elementName: string,
  config: unknown
): Error | undefined =>
  (
    customElements.get(elementName) as ElementWithUiSupportCheck | undefined
  )?.checkUiSupport?.(hass, config);

/**
 * Warnings to show when the config can't be edited in the visual editor,
 * or `undefined` when it can.
 */
export const getUiSupportWarnings = (
  hass: HomeAssistant,
  elementName: string,
  config: unknown
): string[] | undefined => {
  const err = checkElementUiSupport(hass, elementName, config);
  return err ? handleStructError(hass, err).warnings : undefined;
};
