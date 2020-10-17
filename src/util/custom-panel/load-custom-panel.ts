import { loadJS, loadModule } from "../../common/dom/load_resource";
import { CustomPanelConfig } from "../../data/panel_custom";

// Make sure we only import every JS-based panel once (HTML import has this built-in)
const JS_CACHE = {};

export const getUrl = (
  panelConfig: CustomPanelConfig
): { type: "module" | "html" | "js"; url: string } => {
  if (panelConfig.html_url) {
    return {
      type: "html",
      url: panelConfig.html_url,
    };
  }

  // if both module and JS provided, base url on frontend build
  if (panelConfig.module_url && panelConfig.js_url) {
    if (__BUILD__ === "latest") {
      return {
        type: "module",
        url: panelConfig.module_url,
      };
    }

    return {
      type: "js",
      url: panelConfig.js_url,
    };
  }

  if (panelConfig.module_url) {
    return {
      type: "module",
      url: panelConfig.module_url,
    };
  }

  return {
    type: "js",
    url: panelConfig.js_url!,
  };
};

export const loadCustomPanel = (
  panelConfig: CustomPanelConfig
): Promise<unknown> => {
  const panelSource = getUrl(panelConfig);

  if (panelSource.type === "js") {
    if (!(panelSource.url in JS_CACHE)) {
      JS_CACHE[panelSource.url] = loadJS(panelSource.url);
    }
    return JS_CACHE[panelSource.url];
  }
  if (panelSource.type === "module") {
    return loadModule(panelSource.url);
  }
  return Promise.reject("No valid url found in panel config.");
};
