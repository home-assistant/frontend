import { loadJS, loadModule } from "../../common/dom/load_resource";

// Make sure we only import every JS-based panel once (HTML import has this built-in)
const JS_CACHE = {};

export const loadCustomPanel = (panelConfig): Promise<unknown> => {
  if (panelConfig.html_url) {
    const toLoad = [
      import(
        /* webpackChunkName: "import-href-polyfill" */ "../../resources/html-import/import-href"
      ),
    ];

    if (!panelConfig.embed_iframe) {
      toLoad.push(
        import(/* webpackChunkName: "legacy-support" */ "../legacy-support")
      );
    }

    return Promise.all(toLoad).then(([{ importHrefPromise }]) =>
      importHrefPromise(panelConfig.html_url)
    );
  }
  if (panelConfig.js_url) {
    if (!(panelConfig.js_url in JS_CACHE)) {
      JS_CACHE[panelConfig.js_url] = loadJS(panelConfig.js_url);
    }
    return JS_CACHE[panelConfig.js_url];
  }
  if (panelConfig.module_url) {
    return loadModule(panelConfig.module_url);
  }
  return Promise.reject("No valid url found in panel config.");
};
