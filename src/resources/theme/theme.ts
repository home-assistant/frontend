import { fontStyles } from "../roboto";
import { animationStyles } from "./animations.globals";
import { colorDerivedVariables, colorStylesCollection } from "./color";
import { coreDerivedVariables, coreStyles } from "./core.globals";
import { mainDerivedVariables, mainStyles } from "./main.globals";
import { semanticStyles } from "./semantic.globals";
import {
  typographyDerivedVariables,
  typographyStyles,
} from "./typography.globals";
import { waMainDerivedVariables, waMainStyles } from "./wa.globals";

export const themeStyles = [
  coreStyles.toString(),
  mainStyles.toString(),
  typographyStyles.toString(),
  semanticStyles.toString(),
  ...colorStylesCollection,
  fontStyles.toString(),
  waMainStyles.toString(),
  animationStyles.toString(),
].join("");

export const derivedStyles = {
  ...coreDerivedVariables,
  ...mainDerivedVariables,
  ...typographyDerivedVariables,
  ...colorDerivedVariables,
  ...waMainDerivedVariables,
};
