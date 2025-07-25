import type { CSSResult } from "lit";

const _extractCssVars = (
  cssString: string,
  condition: (string: string) => boolean = () => true
) => {
  const variables: Record<string, string> = {};

  cssString.split(";").forEach((rawLine) => {
    const line = rawLine.substring(rawLine.indexOf("--")).trim();
    if (line.startsWith("--") && condition(line)) {
      const [name, value] = line
        .split(":")
        .map((part) => part.replaceAll("}", "").trim());
      variables[name.substring(2, name.length)] = value;
    }
  });
  return variables;
};

/**
 * Recursively resolves a CSS variable reference from a base variable map.
 *
 * If the value of the specified variable in `baseVars` is itself a CSS variable reference
 * (i.e., starts with `var(`), this function will recursively resolve the reference until
 * it finds a concrete value or reaches an undefined variable.
 *
 * @param varName - The name of the CSS variable to resolve.
 * @param baseVars - A record mapping variable names to their values or references.
 * @returns The resolved value of the variable, or `undefined` if not found.
 */
const extractVarFromBase = (
  varName: string,
  baseVars: Record<string, string>
): string | undefined => {
  if (baseVars[varName] && baseVars[varName].startsWith("var(")) {
    const baseVarName = baseVars[varName]
      .substring(6, baseVars[varName].length - 1)
      .trim();
    return extractVarFromBase(baseVarName, baseVars);
  }
  return baseVars[varName];
};

/**
 * Extracts the value of a CSS custom property (CSS variable) from a given CSSResult object.
 *
 * @param css - The CSSResult object containing the CSS string to search.
 * @param varName - The name of the CSS variable (without the leading '--') to extract.
 * @param baseVars - (Optional) A record of base variable names and their values, used to resolve variables that reference other variables via `var()`.
 * @returns The value of the CSS variable if found, otherwise an empty string. If the variable references another variable and `baseVars` is provided, attempts to resolve it from `baseVars`.
 */
export const extractVar = (
  css: CSSResult,
  varName: string,
  baseVars?: Record<string, string>
) => {
  const cssString = css.toString();
  const search = `--${varName}:`;
  const startIndex = cssString.indexOf(search);
  if (startIndex === -1) {
    return "";
  }

  const endIndex = cssString.indexOf(";", startIndex + search.length);
  const value = cssString
    .substring(startIndex + search.length, endIndex)
    .replaceAll("}", "")
    .trim();

  if (baseVars && value.startsWith("var(")) {
    const baseVarName = value.substring(6, value.length - 1).trim();
    return extractVarFromBase(baseVarName, baseVars) || value;
  }

  return value;
};

export const extractVars = (css: CSSResult) => {
  const cssString = css.toString();

  return _extractCssVars(cssString);
};

export const extractDerivedVars = (css: CSSResult) => {
  const cssString = css.toString();

  if (!cssString.includes("var(")) {
    return {};
  }

  return _extractCssVars(cssString, (line) => line.includes("var("));
};
