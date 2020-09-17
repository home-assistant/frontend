// Compat needs to be first import
import "@polymer/polymer/lib/elements/dom-if";
import "@polymer/polymer/lib/elements/dom-repeat";
import "../auth/ha-authorize";
import "../resources/compatibility";
import "../resources/ha-style";
import "../resources/roboto";

// https://github.com/home-assistant/frontend/pull/7031
const isSafari14 = /^((?!chrome|android).)*version\/14\.0.*safari/i.test(
  navigator.userAgent
);
if (isSafari14) {
  const origAttachShadow = window.Element.prototype.attachShadow;
  window.Element.prototype.attachShadow = function (init) {
    if (init && init.delegatesFocus) {
      delete init.delegatesFocus;
    }
    return origAttachShadow.apply(this, [init]);
  };
}

/* polyfill for paper-dropdown */
setTimeout(
  () =>
    import(
      /* webpackChunkName: "polyfill-web-animations-next" */ "web-animations-js/web-animations-next-lite.min"
    ),
  2000
);
