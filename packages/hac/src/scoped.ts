import type { LitElement } from "lit";
import { define } from "./utils/define";
import type { HacElementLoader } from "./utils/dynamic";
import {
  createScopedRegistry,
  scopedCreationScope,
  scopedShadowRootInit,
} from "./utils/scoped-registry";

export type { HacElementLoader } from "./utils/dynamic";
export {
  createScopedRegistry,
  scopedRegistrySupport,
} from "./utils/scoped-registry";
export type { ScopedRegistrySupport } from "./utils/scoped-registry";

/** Elements to register in a scoped registry, by tag name. */
export type ScopedElements = Record<
  string,
  CustomElementConstructor | HacElementLoader
>;

type LitElementConstructor = abstract new (...args: any[]) => LitElement;

/** Static API added by `ScopedElementsMixin`. */
export interface ScopedElementsHostConstructor {
  /** Elements to register in the scoped registry of the class. */
  scopedElements: ScopedElements;
  /** The registry of the class, created and filled on first use. */
  readonly scopedRegistry: CustomElementRegistry;
}

// Registry per host class, `null` without scoped registry support
const registries = new WeakMap<object, CustomElementRegistry | null>();

const registryFor = (
  ctor: ScopedElementsHostConstructor
): CustomElementRegistry => {
  if (!registries.has(ctor)) {
    const registry = createScopedRegistry();
    registries.set(ctor, registry ?? null);
    const target = registry ?? customElements;
    for (const [tagName, element] of Object.entries(ctor.scopedElements)) {
      if ("load" in element) {
        element.load().then((loaded) => define(tagName, loaded, target));
      } else {
        define(tagName, element, target);
      }
    }
  }
  return registries.get(ctor) ?? customElements;
};

/**
 * Renders a Lit element into a shadow root with its own custom element
 * registry, filled from `static scopedElements`. Elements from `dynamic`
 * entry points are registered once they are loaded; already rendered
 * elements upgrade then.
 *
 * Without browser support or the polyfill, elements are registered in the
 * global registry instead, unless their tag name is already taken there.
 *
 * Elements in the light DOM, e.g. slotted content, are not affected: they use
 * the registry of the tree they are written in.
 */
export const ScopedElementsMixin = <T extends LitElementConstructor>(
  superClass: T
) => {
  abstract class ScopedElementsHost extends superClass {
    static scopedElements: ScopedElements = {};

    static get scopedRegistry(): CustomElementRegistry {
      return registryFor(this);
    }

    public attachShadow(init: ShadowRootInit): ShadowRoot {
      const ctor = this.constructor as typeof ScopedElementsHost;
      const registry = ctor.scopedRegistry;
      return super.attachShadow(
        registry === customElements
          ? init
          : scopedShadowRootInit(init, registry)
      );
    }

    protected createRenderRoot() {
      const root = super.createRenderRoot();
      const registry = (this.constructor as typeof ScopedElementsHost)
        .scopedRegistry;
      if (registry !== customElements && root instanceof ShadowRoot) {
        this.renderOptions.creationScope = scopedCreationScope(root, registry);
      }
      return root;
    }
  }
  return ScopedElementsHost as unknown as T & ScopedElementsHostConstructor;
};
