import { loadCSS, loadJS, loadModule } from "../../../common/dom/load_resource";
import { LovelaceResource } from "../../../data/lovelace";
import type { HomeAssistant } from "../../../types";

// CSS and JS should only be imported once. Modules and HTML are safe.
const CSS_CACHE = {};
const JS_CACHE = {};

export const loadLovelaceResources = (
  resources: NonNullable<LovelaceResource[]>,
  hass: HomeAssistant
) => {
  resources.forEach((resource) => {
    const normalizedUrl = new URL(
      resource.url,
      hass.auth.data.hassUrl
    ).toString();
    switch (resource.type) {
      case "css":
        if (normalizedUrl in CSS_CACHE) {
          break;
        }
        CSS_CACHE[normalizedUrl] = loadCSS(normalizedUrl);
        break;

      case "js":
        if (normalizedUrl in JS_CACHE) {
          break;
        }
        JS_CACHE[normalizedUrl] = loadJS(normalizedUrl);
        break;

      case "module":
        loadModule(normalizedUrl);
        break;

      default:
        // eslint-disable-next-line
        console.warn(`Unknown resource type specified: ${resource.type}`);
    }
  });
};
