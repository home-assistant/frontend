import { loadJS } from '../../common/dom/load_resource.js';

// Make sure we only import every JS-based panel once (HTML import has this built-in)
const JS_CACHE = {};

export default async function loadCustomPanel(panelConfig) {
  if (panelConfig.html_url) {
    const toLoad = [
      import(/* webpackChunkName: "import-href-polyfill" */ '../../resources/html-import/import-href.js'),
    ];

    if (!panelConfig.embed_iframe) {
      toLoad.push(import(/* webpackChunkName: "legacy-support" */ '../legacy-support.js'));
    }

    const [{ importHrefPromise }] = await Promise.all(toLoad);
    await importHrefPromise(panelConfig.html_url);
  } else if (panelConfig.js_url) {
    if (!(panelConfig.js_url in JS_CACHE)) {
      JS_CACHE[panelConfig.js_url] = loadJS(panelConfig.js_url);
    }
    await JS_CACHE[panelConfig.js_url];
  } else {
    throw new Error('No valid url found in panel config.');
  }
}
