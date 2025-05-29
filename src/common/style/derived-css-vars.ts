import type { CSSResult } from "lit";

const _extractCssVars = (
  cssString: string,
  condition: (string: string) => boolean = () => true
) => {
  const variables: Record<string, string> = {};

  cssString.split(";").forEach((rawLine) => {
    const line = rawLine.substring(rawLine.indexOf("--")).trim();
    if (line.startsWith("--") && condition(line)) {
      const [name, value] = line.split(":").map((part) => part.trim());
      variables[name.substring(2, name.length)] = value;
    }
  });
  return variables;
};

export const extractVar = (css: CSSResult, varName: string) => {
  const cssString = css.toString();
  const search = `--${varName}:`;
  const startIndex = cssString.indexOf(search);
  if (startIndex === -1) {
    return "";
  }

  const endIndex = cssString.indexOf(";", startIndex + search.length);
  return cssString.substring(startIndex + search.length, endIndex).trim();
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
