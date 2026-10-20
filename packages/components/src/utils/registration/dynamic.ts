import { getProvidedComponent } from "../../provider";
import type { HacElementLoader } from "./definition";
import { isCompatible } from "./version";

/**
 * Loader that prefers the host's copy of a component when its version is
 * compatible with the bundled one, and falls back to `loadScoped`, the bundled
 * component from its `scoped` entry point. The host's copy brings the host's
 * dependencies, the bundled one the bundled dependencies, so they are never
 * mixed.
 *
 * Only the bundled version is needed up front. `loadScoped` should use a
 * dynamic import, so the bundled component is only downloaded when the host
 * cannot provide a compatible copy.
 */
export const createDynamicLoader = (
  tagName: string,
  bundledVersion: string,
  loadScoped: () => Promise<CustomElementConstructor>
): HacElementLoader => {
  let loaded: Promise<CustomElementConstructor> | undefined;

  const load = async (): Promise<CustomElementConstructor> => {
    const provided = await getProvidedComponent(tagName);
    if (provided && isCompatible(provided.version, bundledVersion)) {
      try {
        return await provided.load();
      } catch (_err) {
        // The host failed to load its copy, use the bundled one
      }
    }
    return loadScoped();
  };

  return {
    load: () => {
      loaded ??= load();
      return loaded;
    },
  };
};
