import { unsafeCSS } from "lit";
import { darkColorStyles } from "../../../src/resources/theme/color/color.globals";
import { darkSemanticColorStyles } from "../../../src/resources/theme/color/semantic.globals";
import { darkSemanticStyles } from "../../../src/resources/theme/semantic.globals";
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

export const embedThemeStyles = unsafeCSS(
  scopeThemeStyles(themeStyles, ".theme") +
    scopeThemeStyles(
      [darkSemanticStyles, darkColorStyles, darkSemanticColorStyles].join(""),
      ".theme.dark"
    )
);
