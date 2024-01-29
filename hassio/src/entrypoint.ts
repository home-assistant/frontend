// Compat needs to be first import
import "../../src/resources/compatibility";
import "../../src/resources/safari-14-attachshadow-patch";
import "./hassio-main";

import("../../src/resources/ha-style");
import("@polymer/polymer/lib/utils/settings").then(
  ({ setCancelSyntheticClickEvents }) => setCancelSyntheticClickEvents(false)
);

const styleEl = document.createElement("style");
styleEl.textContent = `
body {
  font-family: Roboto, sans-serif;
  -moz-osx-font-smoothing: grayscale;
  -webkit-font-smoothing: antialiased;
  font-weight: 400;
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
