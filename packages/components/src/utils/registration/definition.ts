/** Resolves the class to register for a tag name, possibly asynchronously. */
export interface HacElementLoader {
  load(): Promise<CustomElementConstructor>;
}

/**
 * An element to register: its tag name and its class, or a loader for it
 * from a `dynamic` entry point. The `scoped` and `dynamic` entry point of an
 * element export one, e.g. `hacCard`.
 */
export interface HacElementDefinition<
  E extends CustomElementConstructor | HacElementLoader =
    CustomElementConstructor | HacElementLoader,
> {
  readonly tagName: string;
  readonly element: E;
}
