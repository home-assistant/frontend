import { getProvidedComponent } from "../provider";
import { isCompatible } from "./version";

/** Resolves the class to register for a tag name, possibly asynchronously. */
export interface HacElementLoader {
  load(): Promise<CustomElementConstructor>;
}

/**
 * Loader that prefers the host's copy of a component when its version is
 * compatible with the bundled one, and uses the bundled one otherwise.
 */
export const createDynamicLoader = (
  tagName: string,
  bundled: CustomElementConstructor & { readonly version: string }
): HacElementLoader => {
  let loaded: Promise<CustomElementConstructor> | undefined;

  const load = async (): Promise<CustomElementConstructor> => {
    const provided = await getProvidedComponent(tagName);
    if (provided && isCompatible(provided.version, bundled.version)) {
      try {
        return await provided.load();
      } catch (_err) {
        // The host failed to load its copy, use the bundled one
      }
    }
    return bundled;
  };

  return {
    load: () => {
      loaded ??= load();
      return loaded;
    },
  };
};
