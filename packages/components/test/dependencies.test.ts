import { LitElement } from "lit";
import { describe, expect, it } from "vitest";
import {
  defineGlobal,
  scopedVariant,
} from "../src/utils/registration/dependencies";

// Entry points decide where a component's dependencies are registered. These
// cases guard that global mode registers them globally and scoped mode never
// shares classes with the global registry.
class Leaf extends LitElement {}
class Parent extends LitElement {
  static readonly dependencies = { "hac-test-leaf": Leaf };
}

describe("defineGlobal", () => {
  it("registers the dependencies with the component", () => {
    defineGlobal("hac-test-parent", Parent);
    expect(customElements.get("hac-test-parent")).toBe(Parent);
    expect(customElements.get("hac-test-leaf")).toBe(Leaf);
  });
});

describe("scopedVariant", () => {
  it("returns components without dependencies unchanged", () => {
    expect(scopedVariant(Leaf)).toBe(Leaf);
  });

  it("returns one subclass per component with dependencies", () => {
    const variant = scopedVariant(Parent);
    expect(variant).not.toBe(Parent);
    expect(variant.prototype).toBeInstanceOf(Parent);
    expect(scopedVariant(Parent)).toBe(variant);
  });
});
