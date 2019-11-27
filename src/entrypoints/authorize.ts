import "@polymer/polymer/lib/elements/dom-if";
import "@polymer/polymer/lib/elements/dom-repeat";

import "../components/ha-iconset-svg";
import "../resources/ha-style";
import "../resources/roboto";

import "../auth/ha-authorize";

/* polyfill for paper-dropdown */
setTimeout(
  () =>
    import(
      /* webpackChunkName: "polyfill-web-animations-next" */ "web-animations-js/web-animations-next-lite.min"
    ),
  2000
);
