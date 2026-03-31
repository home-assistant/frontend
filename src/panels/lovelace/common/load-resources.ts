import { loadCSS, loadJS, loadModule } from "../../../common/dom/load_resource";
import type { LovelaceResource } from "../../../data/lovelace/resource";
import type { HomeAssistant } from "../../../types";

// CSS, JS, and modules should only be imported once.
const CSS_CACHE: Record<string, Promise<unknown>> = {};
const JS_CACHE: Record<string, Promise<unknown>> = {};
const MODULE_CACHE: Record<string, Promise<unknown>> = {};

const _loadLovelaceResource = (
  resource: LovelaceResource,
  hass: HomeAssistant
): Promise<unknown> | undefined => {
  const normalizedUrl = new URL(
    resource.url,
    hass.auth.data.hassUrl
  ).toString();

  switch (resource.type) {
    case "css": {
      if (normalizedUrl in CSS_CACHE) {
        return CSS_CACHE[normalizedUrl];
      }

      const loadTask = loadCSS(normalizedUrl);
      CSS_CACHE[normalizedUrl] = loadTask;
      return loadTask;
    }

    case "js": {
      if (normalizedUrl in JS_CACHE) {
        return JS_CACHE[normalizedUrl];
      }

      const loadTask = loadJS(normalizedUrl);
      JS_CACHE[normalizedUrl] = loadTask;
      return loadTask;
    }

    case "module": {
      if (normalizedUrl in MODULE_CACHE) {
        return MODULE_CACHE[normalizedUrl];
      }

      const loadTask = loadModule(normalizedUrl);
      MODULE_CACHE[normalizedUrl] = loadTask;
      return loadTask;
    }

    default:
      // eslint-disable-next-line
      console.warn(`Unknown resource type specified: ${resource.type}`);
      return undefined;
  }
};

export const loadLovelaceResources = (
  resources: NonNullable<LovelaceResource[]>,
  hass: HomeAssistant
) => {
  resources.forEach((resource) => {
    _loadLovelaceResource(resource, hass);
  });
};

export const loadLovelaceResourcesAndWait = async (
  resources: NonNullable<LovelaceResource[]>,
  hass: HomeAssistant
): Promise<void> => {
  const loadTasks = resources
    .map((resource) => _loadLovelaceResource(resource, hass))
    .filter((task): task is Promise<unknown> => task !== undefined);

  await Promise.allSettled(loadTasks);
};
