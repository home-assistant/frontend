import { setPassiveTouchGestures } from "@polymer/polymer/lib/utils/settings";
import "../resources/roboto";
import "../resources/ha-style";
import "../layouts/home-assistant";
import "../resources/html-import/polyfill";
import "../util/legacy-support";

setPassiveTouchGestures(true);
/* LastPass createElement workaround. See #428 */
document.createElement = Document.prototype.createElement;

(window as any).frontendVersion = __VERSION__;
