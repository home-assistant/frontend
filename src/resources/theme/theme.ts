import { fontStyles } from "../roboto";
import { colorDerivedVariables, colorStylesCollection } from "./color";
import { mainDerivedVariables, mainStyles } from "./main.globals";
import {
  typographyDerivedVariables,
  typographyStyles,
} from "./typography.globals";

export const themeStyles = [
  mainStyles.toString(),
  typographyStyles.toString(),
  ...colorStylesCollection,
  fontStyles.toString(),
].join("");

export const derivedStyles = {
  ...mainDerivedVariables,
  ...typographyDerivedVariables,
  ...colorDerivedVariables,
};
