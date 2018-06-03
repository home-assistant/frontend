import { loadJS } from '../../common/dom/load_resource.js';

// Make sure we only import every JS-based panel once (HTML import has this built-in)
const JS_CACHE = {};

export default function loadCustomPanel(panelConfig) {
  if ('html_url' in panelConfig) {
    return Promise.all([
      import(/* webpackChunkName: "legacy-support" */ '../legacy-support.js'),
      import(/* webpackChunkName: "import-href-polyfill" */ '../../resources/html-import/import-href.js'),
    // eslint-disable-next-line
    ]).then(([{}, { importHrefPromise }]) => importHrefPromise(panelConfig.html_url));
  } else if (panelConfig.js_url) {
    if (!(panelConfig.js_url in JS_CACHE)) {
      JS_CACHE[panelConfig.js_url] = loadJS(panelConfig.js_url);
    }
    return JS_CACHE[panelConfig.js_url];
  }
  return Promise.reject('No valid url found in panel config.');
}
