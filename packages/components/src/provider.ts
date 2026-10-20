/**
 * Lets a host app (Home Assistant) offer its own copies of hac components to
 * code loaded into the same page, like custom cards. `dynamic` entry points
 * use them when the version is compatible.
 *
 * The host only publishes names, versions and loaders, so no component code
 * is loaded until a consumer asks for it. It publishes them as early as
 * possible; consumers that ask before that use their bundled copies.
 */

export interface HacProvidedComponent {
  /** Version of the component, see the component's `info.ts`. */
  version: string;
  /** Loads the host's class of the component. */
  load: () => Promise<CustomElementConstructor>;
}

export type HacProvidedComponents = Record<string, HacProvidedComponent>;

/** Key on `globalThis`, shared by all copies of this library in the page. */
export const HAC_PROVIDER_KEY = Symbol.for(
  "@home-assistant/components/provider"
);

type GlobalWithProvider = typeof globalThis & {
  [HAC_PROVIDER_KEY]?: HacProvidedComponents;
};

/** Called by the host app to publish the components it provides. */
export const provideComponents = (components: HacProvidedComponents): void => {
  (globalThis as GlobalWithProvider)[HAC_PROVIDER_KEY] = components;
};

/** The component provided by the host for a tag name, if any. */
export const getProvidedComponent = (
  tagName: string
): HacProvidedComponent | undefined => {
  const components = (globalThis as GlobalWithProvider)[HAC_PROVIDER_KEY];
  return components && Object.prototype.hasOwnProperty.call(components, tagName)
    ? components[tagName]
    : undefined;
};
