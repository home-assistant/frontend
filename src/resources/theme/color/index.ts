import {
  extractDerivedVars,
  extractVars,
} from "../../../common/style/derived-css-vars";
import {
  colorStyles,
  darkColorStyles,
  DefaultPrimaryColor,
  DefaultAccentColor,
  DefaultThemeColor,
} from "./color.globals";
import { coreColorStyles } from "./core.globals";
import {
  darkSemanticColorStyles,
  semanticColorStyles,
} from "./semantic.globals";
import { waColorStyles } from "./wa.globals";

export const darkColorVariables = {
  ...extractVars(darkColorStyles),
  ...extractVars(darkSemanticColorStyles),
};

export const colorDerivedVariables = {
  ...extractDerivedVars(colorStyles),
  ...extractDerivedVars(semanticColorStyles),
  ...extractDerivedVars(waColorStyles),
};

export const colorStylesCollection = [
  coreColorStyles.toString(),
  semanticColorStyles.toString(),
  colorStyles.toString(),
  waColorStyles.toString(),
];

// Export color constants for use by Home Assistant Core
export { DefaultPrimaryColor, DefaultAccentColor, DefaultThemeColor };
