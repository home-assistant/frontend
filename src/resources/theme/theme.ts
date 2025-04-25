import { fontStyles } from "../roboto";
import { colorDerivedVariables, colorStyles } from "./color";
import { mainDerivedVariables, mainStyles } from "./main";
import { typographyDerivedVariables, typographyStyles } from "./typography";

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
