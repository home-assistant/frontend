// @ts-ignore
import skeletonStyles from "fullcalendar/skeleton.css";
// @ts-ignore
import classicThemeStyles from "fullcalendar/themes/classic/theme.css";
import { unsafeCSS } from "lit";

// Apart from css`` templates, as the minifier that compiles those for legacy
// browsers skips every file that calls unsafeCSS
export const fullCalendarBaseStyles = [
  unsafeCSS(skeletonStyles),
  unsafeCSS(classicThemeStyles),
];
