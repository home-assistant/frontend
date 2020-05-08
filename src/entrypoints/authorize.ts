import "@polymer/polymer/lib/elements/dom-if.js";
import "@polymer/polymer/lib/elements/dom-repeat.js";
import "../auth/ha-authorize";
import "../resources/ha-style";
import "../resources/roboto";

/* polyfill for paper-dropdown */
setTimeout(
  () =>
    import(
      /* webpackChunkName: "polyfill-web-animations-next" */ "web-animations-js/web-animations-next-lite.min"
    ),
  2000
);
