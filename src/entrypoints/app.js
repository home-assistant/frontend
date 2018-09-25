// Load polyfill first so HTML imports start resolving
/* eslint-disable import/first */
import '../resources/html-import/polyfill.js';
import '@polymer/app-route/app-location.js';
import '@polymer/app-route/app-route.js';
import '@polymer/iron-flex-layout/iron-flex-layout-classes.js';
import '@polymer/paper-styles/typography.js';
import { setPassiveTouchGestures } from '@polymer/polymer/lib/utils/settings.js';

import '../util/legacy-support';
import '../resources/roboto.js';

// For MDI icons. Needs to be part of main bundle or else it won't hook
// properly into iron-meta, which is used to transfer iconsets to iron-icon.
import '../components/ha-iconset-svg.js';

import '../layouts/app/home-assistant.js';

/* polyfill for paper-dropdown */
setTimeout(
  () => import(/* webpackChunkName: "polyfill-web-animations-next" */ 'web-animations-js/web-animations-next-lite.min.js'),
  2000
);

setPassiveTouchGestures(true);
/* LastPass createElement workaround. See #428 */
document.createElement = Document.prototype.createElement;
