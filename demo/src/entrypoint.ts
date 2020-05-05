import "@polymer/paper-styles/typography";
import "@polymer/polymer/lib/elements/dom-if";
import "@polymer/polymer/lib/elements/dom-repeat";
import "../../src/resources/ha-style";
import "../../src/resources/roboto";
import "./ha-demo";

/* polyfill for paper-dropdown */
setTimeout(() => {
  import(
    /* webpackChunkName: "polyfill-web-animations-next" */ "web-animations-js/web-animations-next-lite.min"
  );
}, 1000);
