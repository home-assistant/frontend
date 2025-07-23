import {
  extractDerivedVars,
  extractVars,
} from "../../../common/style/derived-css-vars";
import { colorStyles, darkColorStyles } from "./color.globals";
import { coreColorStyles } from "./core.globals";
import {
  darkSemanticColorStyles,
  semanticColorStyles,
} from "./semantic.globals";

export const darkColorVariables = {
  ...extractVars(darkColorStyles),
  ...extractVars(darkSemanticColorStyles),
};

export const colorDerivedVariables = {
  ...extractDerivedVars(colorStyles),
  ...extractDerivedVars(semanticColorStyles),
};

export const colorStylesCollection = [
  coreColorStyles.toString(),
  semanticColorStyles.toString(),
  colorStyles.toString(),
];
