import { load } from "js-yaml";

/**
 * Parses the data in a `<script type="application/json">` or
 * `<script type="text/yaml">` child of the element.
 */
export const readScriptData = (element: HTMLElement): unknown => {
  const script = element.querySelector<HTMLScriptElement>(
    ':scope > script[type="application/json"], :scope > script[type="text/yaml"]'
  );
  if (!script) {
    return undefined;
  }
  return script.type === "text/yaml"
    ? load(script.textContent!)
    : JSON.parse(script.textContent!);
};

/** The data of a script child that holds an object, such as a config. */
export type ScriptObject = object;

/** The object in a script child, see `readScriptData`, if it holds one. */
export const readScriptObject = (
  element: HTMLElement
): ScriptObject | undefined => {
  const data = readScriptData(element);

  return typeof data === "object" && data !== null && !Array.isArray(data)
    ? data
    : undefined;
};
