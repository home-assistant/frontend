/**
 * Scoped custom element registries come in two flavors: the standard API
 * (Chrome 146+, Safari 26) and the older API of
 * `@webcomponents/scoped-custom-element-registry`, which Home Assistant loads
 * and which replaces the native implementation when present.
 */
export type ScopedRegistrySupport = "polyfill" | "native" | "none";

let support: ScopedRegistrySupport | undefined;

export const scopedRegistrySupport = (): ScopedRegistrySupport => {
  if (support) {
    return support;
  }
  if ("CustomElementRegistryPolyfill" in globalThis) {
    support = "polyfill";
  } else {
    try {
      new CustomElementRegistry();
      support = "native";
    } catch (_err) {
      support = "none";
    }
  }
  return support;
};

/** A new scoped registry, or `undefined` if the browser has no support. */
export const createScopedRegistry = (): CustomElementRegistry | undefined =>
  scopedRegistrySupport() === "none" ? undefined : new CustomElementRegistry();

/** Shadow root options that make the shadow root use `registry`. */
export const scopedShadowRootInit = (
  init: ShadowRootInit,
  registry: CustomElementRegistry
): ShadowRootInit =>
  scopedRegistrySupport() === "polyfill"
    ? ({ ...init, registry } as ShadowRootInit)
    : ({ ...init, customElementRegistry: registry } as ShadowRootInit);

interface CreationScope {
  importNode(node: Node, deep?: boolean): Node;
}

/**
 * The object Lit should create template content with, so custom elements in
 * it are created from the scoped registry (Lit's `creationScope`).
 */
export const scopedCreationScope = (
  root: ShadowRoot,
  registry: CustomElementRegistry
): CreationScope => {
  if (scopedRegistrySupport() === "polyfill") {
    // The polyfill adds importNode to shadow roots
    return root as unknown as CreationScope;
  }
  // Standard API: the registry is passed to importNode
  return {
    importNode: (node, deep) =>
      (
        document.importNode as (
          node: Node,
          options: { selfOnly: boolean; customElementRegistry: unknown }
        ) => Node
      )(node, { selfOnly: !deep, customElementRegistry: registry }),
  };
};
