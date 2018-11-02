// Load polyfill first so HTML imports start resolving
/* eslint-disable import/first */
import "../resources/html-import/polyfill";
import "@polymer/app-route/app-location";
import "@polymer/app-route/app-route";
import "@polymer/iron-flex-layout/iron-flex-layout-classes";
import "@polymer/paper-styles/typography";
import { setPassiveTouchGestures } from "@polymer/polymer/lib/utils/settings";

import "../util/legacy-support";
import "../resources/roboto";

// For MDI icons. Needs to be part of main bundle or else it won't hook
// properly into iron-meta, which is used to transfer iconsets to iron-icon.
import "../components/ha-iconset-svg";

import "../layouts/app/home-assistant";

/* polyfill for paper-dropdown */
setTimeout(
  () =>
    import(/* webpackChunkName: "polyfill-web-animations-next" */ "web-animations-js/web-animations-next-lite.min"),
  2000
);

setPassiveTouchGestures(true);
/* LastPass createElement workaround. See #428 */
document.createElement = Document.prototype.createElement;
