// Load polyfill first so HTML imports start resolving
/* eslint-disable import/first */
import "@polymer/paper-styles/typography";
import { setPassiveTouchGestures } from "@polymer/polymer/lib/utils/settings";
import "../layouts/home-assistant";
import "../resources/html-import/polyfill";
import "../resources/roboto";
import "../util/legacy-support";

setPassiveTouchGestures(true);
/* LastPass createElement workaround. See #428 */
document.createElement = Document.prototype.createElement;

(window as any).frontendVersion = __VERSION__;
