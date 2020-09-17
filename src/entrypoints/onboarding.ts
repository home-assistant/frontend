// Compat needs to be first import
import "../onboarding/ha-onboarding";
import "../resources/compatibility";
import "../resources/ha-style";
import "../resources/roboto";

declare global {
  interface Window {
    stepsPromise: Promise<Response>;
  }
}

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
