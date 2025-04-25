import { css } from "lit";

const trimWithLineBreak = (str: string) => str.replaceAll("\n", "").trim();

export const extractDerivedVars = (
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
    cssString.split(";").forEach((line) => {
      if (trimWithLineBreak(line).startsWith("--") && line.includes("var(")) {
        const [name, value] = line.split(":").map((part) => part.trim());
        derivedVariables[name.substring(2, name.length)] = value;
      }
    });
  }

  return {
    css: css([cssString] as unknown as TemplateStringsArray),
    derivedVariables,
  };
};
