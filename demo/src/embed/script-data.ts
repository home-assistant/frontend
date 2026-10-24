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
