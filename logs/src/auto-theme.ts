import { darkSemanticColorStyles } from "../../src/resources/theme/color/semantic.globals";
import { darkColorStyles } from "../../src/resources/theme/color/color.globals";

const mql = matchMedia("(prefers-color-scheme: dark)");

function applyTheme(dark: boolean) {
  const el = document.documentElement;
  if (dark) {
    el.setAttribute("dark", "");
  } else {
    el.removeAttribute("dark");
  }
}

// Add dark theme styles wrapped in media query
// This runs after append-ha-style has loaded the base theme
const styleElement = document.createElement("style");
styleElement.id = "auto-theme-dark";
styleElement.textContent = `
  @media (prefers-color-scheme: dark) {
    ${darkSemanticColorStyles.cssText}
    ${darkColorStyles.cssText}
  }
`;
// Append to head to ensure it comes after base styles
document.head.appendChild(styleElement);

// Apply theme on initial load
applyTheme(mql.matches);

// Listen for theme changes
mql.addEventListener("change", (e) => {
  applyTheme(e.matches);
});
