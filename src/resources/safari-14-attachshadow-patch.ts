// https://github.com/home-assistant/frontend/pull/7031

export {}; // for Babel to treat as a module

const isSafari14 = /^((?!chrome|android).)*version\/14\.0\s.*safari/i.test(
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
