// https://github.com/home-assistant/frontend/pull/7031
import { isSafari14 } from "../util/is_safari";

if (isSafari14) {
  const origAttachShadow = window.Element.prototype.attachShadow;
  window.Element.prototype.attachShadow = function (init) {
    if (init && init.delegatesFocus) {
      delete init.delegatesFocus;
    }
    return origAttachShadow.apply(this, [init]);
  };
}
