// Compat needs to be first import
import "../resources/compatibility";
import "../resources/safari-14-attachshadow-patch";
import "@polymer/polymer/lib/elements/dom-if";
import "@polymer/polymer/lib/elements/dom-repeat";
import "../auth/ha-authorize";
import "../resources/ha-style";
import "../resources/roboto";

/* polyfill for paper-dropdown */
setTimeout(
  () => import("web-animations-js/web-animations-next-lite.min"),
  2000
);
