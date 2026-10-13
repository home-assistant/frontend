import { loadCSS, loadJS, loadModule } from "../../../common/dom/load_resource";
import type { LovelaceResource } from "../../../data/lovelace/resource";
import type { HomeAssistant } from "../../../types";

// CSS and JS should only be imported once. Modules and HTML are safe.
const CSS_CACHE: Record<string, Promise<unknown>> = {};
const JS_CACHE: Record<string, Promise<unknown>> = {};

const _loadLovelaceResource = (
  resource: LovelaceResource,
  hass: HomeAssistant
): Promise<unknown> | undefined => {
  const normalizedUrl = new URL(
    resource.url,
    hass.auth.data.hassUrl
  ).toString();

  const logLoadError = (err: unknown) => {
    // eslint-disable-next-line no-console
    console.error(
      `Failed to load Lovelace resource ${normalizedUrl} (type: ${resource.type}). Check that the URL is correct and the file exists.`,
      err
    );
  };

  switch (resource.type) {
    case "css": {
      if (normalizedUrl in CSS_CACHE) {
        return CSS_CACHE[normalizedUrl];
      }

      // Catch before caching, so a cache hit cannot log the failure again
      const loadTask = loadCSS(normalizedUrl).catch(logLoadError);
      CSS_CACHE[normalizedUrl] = loadTask;
      return loadTask;
    }

    case "js": {
      if (normalizedUrl in JS_CACHE) {
        return JS_CACHE[normalizedUrl];
      }

      const loadTask = loadJS(normalizedUrl).catch(logLoadError);
      JS_CACHE[normalizedUrl] = loadTask;
      return loadTask;
    }

    case "module":
      return loadModule(normalizedUrl).catch(logLoadError);

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
