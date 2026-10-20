import type { LitElement } from "lit";
import { define } from "./utils/define";
import type { HacElementLoader } from "./utils/dynamic";
import {
  createScopedRegistry,
  scopedCreationScope,
  scopedRegistrySupport,
  scopedShadowRootInit,
} from "./utils/scoped-registry";

export type { HacElementLoader } from "./utils/dynamic";
export { scopedRegistrySupport } from "./utils/scoped-registry";
export type { ScopedRegistrySupport } from "./utils/scoped-registry";

/**
 * Elements to register in a scoped registry, by tag name: classes from
 * `<name>/scoped` entry points or loaders from `<name>/dynamic` ones.
 */
export type ScopedElements = Record<
  string,
  CustomElementConstructor | HacElementLoader
>;

/**
 * Creates a registry with the given elements, for `attachScopedShadow`.
 * Create it once, e.g. at module level, and share it between instances.
 *
 * Loaders of `dynamic` entry points register their element once it is
 * loaded; elements rendered before that upgrade then.
 *
 * Without scoped registry support (native or polyfill), the elements are
 * registered in the global registry instead, unless their tag name is already
 * taken there, and the global registry is returned.
 */
export const createScopedElementRegistry = (
  elements: ScopedElements
): CustomElementRegistry => {
  if (typeof elements !== "object" || elements === null) {
    throw new TypeError(
      "@home-assistant/components: pass the elements to register, e.g. { ...hacCardElements }"
    );
  }
  const registry = createScopedRegistry() ?? customElements;
  for (const [tagName, element] of Object.entries(elements)) {
    if ("load" in element) {
      element.load().then((loaded) => define(tagName, loaded, registry));
    } else {
      define(tagName, element, registry);
    }
  }
  return registry;
};

const shadowRootInit = (
  init: ShadowRootInit,
  registry: CustomElementRegistry
): ShadowRootInit =>
  registry === customElements ? init : scopedShadowRootInit(init, registry);

const registries = new WeakMap<ShadowRoot, CustomElementRegistry>();

/**
 * Attaches a shadow root that uses `registry` for custom elements in it.
 *
 * Content added with `innerHTML` or `insertAdjacentHTML` uses the registry.
 * Create single elements with `createScopedElement`; `document.createElement`
 * would use the global registry.
 *
 * Light DOM content, like slotted elements, keeps using the registry of the
 * tree it is written in.
 */
export const attachScopedShadow = (
  host: HTMLElement,
  init: ShadowRootInit,
  registry: CustomElementRegistry
): ShadowRoot => {
  const root = host.attachShadow(shadowRootInit(init, registry));
  registries.set(root, registry);
  return root;
};

/** Creates an element from the registry of a shadow root. */
export const createScopedElement = <K extends keyof HTMLElementTagNameMap>(
  root: ShadowRoot,
  tagName: K
): HTMLElementTagNameMap[K] => {
  const registry = registries.get(root);
  if (!registry || registry === customElements) {
    return document.createElement(tagName);
  }
  if (scopedRegistrySupport() === "polyfill") {
    // The polyfill adds createElement to shadow roots
    return (
      root as unknown as {
        createElement(tagName: K): HTMLElementTagNameMap[K];
      }
    ).createElement(tagName);
  }
  return (
    document.createElement as (
      tagName: K,
      options: { customElementRegistry: CustomElementRegistry }
    ) => HTMLElementTagNameMap[K]
  )(tagName, { customElementRegistry: registry });
};

type LitElementConstructor = abstract new (...args: any[]) => LitElement;

/** Static API added by `ScopedElementsMixin`. */
export interface ScopedElementsHostConstructor {
  /** The registry of the class, created on first use. */
  readonly scopedRegistry: CustomElementRegistry;
}

/**
 * Renders a Lit element into a shadow root with its own custom element
 * registry, containing `elements`:
 *
 * ```ts
 * class MyCard extends ScopedElementsMixin(LitElement, { ...hacCardElements }) {}
 * ```
 *
 * See `createScopedElementRegistry` and `attachScopedShadow` for the details.
 */
export const ScopedElementsMixin = <T extends LitElementConstructor>(
  superClass: T,
  elements: ScopedElements
) => {
  // Created on first use, so defining the class has no side effects
  let registry: CustomElementRegistry | undefined;
  const getRegistry = () => {
    registry ??= createScopedElementRegistry(elements);
    return registry;
  };

  abstract class ScopedElementsHost extends superClass {
    static get scopedRegistry(): CustomElementRegistry {
      return getRegistry();
    }

    public attachShadow(init: ShadowRootInit): ShadowRoot {
      const root = super.attachShadow(shadowRootInit(init, getRegistry()));
      registries.set(root, getRegistry());
      return root;
    }

    protected createRenderRoot() {
      const root = super.createRenderRoot();
      const scoped = getRegistry();
      if (scoped !== customElements && root instanceof ShadowRoot) {
        this.renderOptions.creationScope = scopedCreationScope(root, scoped);
      }
      return root;
    }
  }
  return ScopedElementsHost as unknown as T & ScopedElementsHostConstructor;
};
