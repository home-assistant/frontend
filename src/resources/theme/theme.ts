import { fontStyles } from "../roboto";
import { colorDerivedVariables, colorStylesCollection } from "./color";
import { mainDerivedVariables, mainStyles } from "./main.globals";
import {
  typographyDerivedVariables,
  typographyStyles,
} from "./typography.globals";
import { waMainDerivedVariables, waMainStyles } from "./wa.globals";

export const themeStyles = [
  mainStyles.toString(),
  typographyStyles.toString(),
  ...colorStylesCollection,
  fontStyles.toString(),
  waMainStyles.toString(),
].join("");

export const derivedStyles = {
  ...mainDerivedVariables,
  ...typographyDerivedVariables,
  ...colorDerivedVariables,
  ...waMainDerivedVariables,
};
