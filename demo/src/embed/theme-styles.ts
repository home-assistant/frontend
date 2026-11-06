import { css, unsafeCSS } from "lit";
import { hex2rgb } from "../../../src/common/color/convert-color";
import { darkColorVariables } from "../../../src/resources/theme/color";
import { darkSemanticVariables } from "../../../src/resources/theme/semantic.globals";
import { themeStyles } from "../../../src/resources/theme/theme";

// The theme styles set variables on `html`, next to fonts and other page
// styles. Only the variables, media queries, and keyframes are copied, and
// `html` becomes `selector`. This keeps the theme inside the card, so that it
// does not change the page that embeds the card.
const scopeThemeStyles = (cssText: string, selector: string): string => {
  // A style element in a separate document parses the CSS without applying it.
  const doc = document.implementation.createHTMLDocument("");
  const style = doc.createElement("style");
  style.textContent = cssText;
  doc.head.append(style);

  const convert = (rules: CSSRuleList): string =>
    Array.from(rules, (rule) => {
      if (rule instanceof CSSStyleRule) {
        if (rule.selectorText !== "html") {
          return "";
        }
        const variables = Array.from(rule.style)
          .filter((name) => name.startsWith("--"))
          .map((name) => `${name}:${rule.style.getPropertyValue(name)};`);
        return `${selector}{${variables.join("")}}`;
      }
      if (rule instanceof CSSMediaRule) {
        return `@media ${rule.conditionText}{${convert(rule.cssRules)}}`;
      }
      if (rule instanceof CSSKeyframesRule) {
        return rule.cssText;
      }
      return "";
    }).join("");

  return convert(style.sheet!.cssRules);
};

const darkTheme = {
  ...darkSemanticVariables,
  ...darkColorVariables,
};

// Like processTheme in apply_themes_on_element, each hex color also sets its
// `--rgb-` variable, else those keep their light theme values
const darkVariables = Object.entries(darkTheme).flatMap(([name, value]) => {
  const variable = `--${name}:${value};`;

  if (!value.startsWith("#") || `rgb-${name}` in darkTheme) {
    return [variable];
  }

  return [variable, `--rgb-${name}:${hex2rgb(value).join(",")};`];
});

export const embedThemeStyles = unsafeCSS(
  scopeThemeStyles(themeStyles, ".theme") +
    `.theme.dark{${darkVariables.join("")}}`
);

/**
 * The styles of every embed element: the theme, and the page styles of the
 * app, for the `.theme` wrapper of `EmbedElement`.
 */
export const embedElementStyles = [
  embedThemeStyles,
  css`
    :host([hidden]) {
      display: none;
    }
    /* The text styles the app sets on html and body, so that the content does
       not inherit the text styles of the page that embeds it. */
    .theme {
      color: var(--primary-text-color);
      font-family: var(--ha-font-family-body);
      font-size: var(--ha-font-size-m);
      font-weight: var(--ha-font-weight-body);
      line-height: normal;
      letter-spacing: normal;
      text-align: start;
      -moz-osx-font-smoothing: var(--ha-moz-osx-font-smoothing);
      -webkit-font-smoothing: var(--ha-font-smoothing);
    }
    /* What setDirectionStyles sets on the app for a right-to-left language,
       here only for the content */
    .theme[dir="rtl"] {
      --direction: rtl;
      --float-start: right;
      --float-end: left;
      --scale-direction: -1;
    }
  `,
];
