import "../../src/resources/ha-style";
import "../../src/resources/roboto";
import "../../src/resources/safari-14-attachshadow-patch";
import "./ha-demo";

/* polyfill for paper-dropdown */
setTimeout(() => {
  import("web-animations-js/web-animations-next-lite.min");
}, 1000);
