import { css } from "lit";

export const splitCssVars = (
  string: TemplateStringsArray,
  ...values: any[]
) => {
  const cssString = string.reduce(
    (result, currentString, index) =>
      result + currentString + (values[index] || ""),
    ""
  );

  const derivedVariables: Record<string, string> = {};

  if (cssString.includes("var(")) {
    cssString.split("\n").forEach((line) => {
      if (line.trim().startsWith("--") && line.includes("var(")) {
        const [name, value] = line.split(":").map((part) => part.trim());
        derivedVariables[name.replace(/--/g, "")] = value.replace(/;/g, "");
      }
    });
  }

  return {
    css: css([cssString] as unknown as TemplateStringsArray),
    derivedVariables,
  };
};
