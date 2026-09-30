import { handleStructError } from "../../../common/structs/handle-errors";
import type { LocalizeFunc } from "../../../common/translations/localize";

/**
 * Static check on editor elements, returns an error when the config can't be
 * edited in the visual editor. Must not depend on element state.
 */
export type CheckUiSupport<T = any> = (
  localize: LocalizeFunc,
  config: T
) => Error | undefined;

/** YAML can parse to scalars like `null`, which are never valid configs */
export const isConfigObject = (
  value: unknown
): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

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

export const getUiSupportWarnings = (
  localize: LocalizeFunc,
  elementName: string,
  config: unknown
): string[] | undefined => {
  const err = checkElementUiSupport(localize, elementName, config);
  return err ? handleStructError(localize, err).warnings : undefined;
};
