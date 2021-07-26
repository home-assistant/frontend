// Compat needs to be first import
import "../resources/compatibility";
import "../auth/ha-authorize";
import "../resources/ha-style";
import "../resources/roboto";
import "../resources/safari-14-attachshadow-patch";

/* polyfill for paper-dropdown */
setTimeout(
  () => import("web-animations-js/web-animations-next-lite.min"),
  2000
);
