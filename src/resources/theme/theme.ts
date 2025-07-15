import { fontStyles } from "../roboto";
import { colorDerivedVariables, colorStyles } from "./color.globals";
import { mainDerivedVariables, mainStyles } from "./main.globals";
import {
  typographyDerivedVariables,
  typographyStyles,
} from "./typography.globals";

export const themeStyles = [
  mainStyles.toString(),
  typographyStyles.toString(),
  colorStyles.toString(),
  fontStyles.toString(),
].join("");

export const derivedStyles = {
  ...mainDerivedVariables,
  ...typographyDerivedVariables,
  ...colorDerivedVariables,
};
