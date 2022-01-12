// https://github.com/home-assistant/frontend/pull/7031
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
