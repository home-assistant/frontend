/**
 * Lets a host app (Home Assistant) offer its own copies of hac components to
 * code loaded into the same page, like custom cards. `dynamic` entry points
 * use them when the version is compatible.
 *
 * The host only publishes names, versions and loaders, so no component code
 * is loaded until a consumer asks for it.
 */

export interface HacProvidedComponent {
  /** Version of the component, see the component's `version.ts`. */
  version: string;
  /** Loads the host's class of the component. */
  load: () => Promise<CustomElementConstructor>;
}

export type HacProvidedComponents = Record<string, HacProvidedComponent>;

/**
 * Slot on `globalThis` shared by all copies of this library in the page.
 *
 * A host creates the slot synchronously before any other script runs, so
 * consumers that load in parallel with the host can wait for it. This must
 * be plain ES5 in the host's HTML, e.g.:
 *
 * ```js
 * var r, p = new Promise(function (resolve) { r = resolve; });
 * window[Symbol.for("@home-assistant/hac/provider")] = { components: p, resolve: r };
 * ```
 */
export interface HacProviderSlot {
  components: Promise<HacProvidedComponents>;
  resolve: (components: HacProvidedComponents) => void;
}

export const HAC_PROVIDER_KEY = Symbol.for("@home-assistant/hac/provider");

type GlobalWithProvider = typeof globalThis & {
  [HAC_PROVIDER_KEY]?: HacProviderSlot;
};

const createSlot = (): HacProviderSlot => {
  let resolve!: HacProviderSlot["resolve"];
  const components = new Promise<HacProvidedComponents>((res) => {
    resolve = res;
  });
  return { components, resolve };
};

/** Called by the host app to publish the components it provides. */
export const provideComponents = (components: HacProvidedComponents): void => {
  const global = globalThis as GlobalWithProvider;
  global[HAC_PROVIDER_KEY] ??= createSlot();
  global[HAC_PROVIDER_KEY].resolve(components);
};

/**
 * The component provided by the host for a tag name. Resolves to `undefined`
 * right away when the page has no host.
 */
export const getProvidedComponent = async (
  tagName: string
): Promise<HacProvidedComponent | undefined> => {
  const slot = (globalThis as GlobalWithProvider)[HAC_PROVIDER_KEY];
  if (!slot) {
    return undefined;
  }
  const components = await slot.components;
  return Object.prototype.hasOwnProperty.call(components, tagName)
    ? components[tagName]
    : undefined;
};
