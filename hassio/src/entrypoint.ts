import {
  haFontFamilyBody,
  haFontSmoothing,
  haMozOsxFontSmoothing,
} from "../../src/resources/theme/typography.globals";
import "./hassio-main";

import("../../src/resources/append-ha-style");

const styleEl = document.createElement("style");
styleEl.textContent = `
body {
  font-family: ${haFontFamilyBody};
  -moz-osx-font-smoothing: ${haMozOsxFontSmoothing};
  -webkit-font-smoothing: ${haFontSmoothing};
  font-weight: var(--ha-font-weight-normal);
  margin: 0;
  padding: 0;
  height: 100vh;
}
@media (prefers-color-scheme: dark) {
  body {
    background-color: #111111;
    color: #e1e1e1;
  }
}
`;
document.head.appendChild(styleEl);
