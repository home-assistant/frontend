/**
 * An element to register: its tag name and its class. The `scoped` entry
 * point of an element exports one, e.g. `hacCard`.
 */
export interface ElementDefinition<
  E extends CustomElementConstructor = CustomElementConstructor,
> {
  readonly tagName: string;
  readonly element: E;
}
