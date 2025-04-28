import { fontStyles } from "../roboto";
import { colorDerivedVariables, colorStyles } from "./color.globals";
import { mainDerivedVariables, mainStyles } from "./main.globals";
import {
  typographyDerivedVariables,
  typographyStyles,
} from "./typography.globals";

export const themeStyles = [
  fontStyles.toString(),
  mainStyles.toString(),
  typographyStyles.toString(),
  colorStyles.toString(),
].join("");

export const derivedStyles = {
  ...mainDerivedVariables,
  ...typographyDerivedVariables,
  ...colorDerivedVariables,
};
