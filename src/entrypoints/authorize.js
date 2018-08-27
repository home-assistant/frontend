import '@polymer/polymer/lib/elements/dom-if.js';
import '@polymer/polymer/lib/elements/dom-repeat.js';

import '../components/ha-iconset-svg.js';
import '../resources/ha-style.js';
import '../resources/roboto.js';

import '../auth/ha-authorize.js';

/* polyfill for paper-dropdown */
setTimeout(() => import(
  /* webpackChunkName: "polyfill-web-animations-next" */
  'web-animations-js/web-animations-next-lite.min.js'), 2000);
