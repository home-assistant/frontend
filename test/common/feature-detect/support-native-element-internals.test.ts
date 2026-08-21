import { afterEach, describe, expect, it, vi } from "vitest";

const originalAttachInternals = HTMLElement.prototype.attachInternals;
const originalElementInternals = window.ElementInternals;

// The probe memoizes its result, so re-import the module for each scenario.
const loadProbe = async () => {
  vi.resetModules();
  const mod =
    await import("../../../src/common/feature-detect/support-native-element-internals");
  return mod.supportsNativeElementInternals;
};

describe("supportsNativeElementInternals", () => {
  afterEach(() => {
    HTMLElement.prototype.attachInternals = originalAttachInternals;
    window.ElementInternals = originalElementInternals;
  });

  it("returns true with native ElementInternals", async () => {
    const supportsNativeElementInternals = await loadProbe();
    expect(supportsNativeElementInternals()).toBe(true);
  });

  it("returns true when attachInternals is wrapped by a delegating function", async () => {
    // Simulates @webcomponents/scoped-custom-element-registry, which the app
    // bundle loads. Wrapping used to make detection fail (#53337).
    HTMLElement.prototype.attachInternals = function (this: HTMLElement) {
      return originalAttachInternals.call(this);
    };
    const supportsNativeElementInternals = await loadProbe();
    expect(supportsNativeElementInternals()).toBe(true);
  });

  it("returns false when element-internals-polyfill replaces the global", async () => {
    // The polyfill swaps in its own class, so the mere presence of
    // window.ElementInternals says nothing about native support (#51338).
    class PolyfilledElementInternals {
      public setFormValue = (): void => undefined;

      public setValidity = (): void => undefined;

      public checkValidity = (): boolean => true;

      public reportValidity = (): boolean => true;
    }
    window.ElementInternals =
      PolyfilledElementInternals as unknown as typeof window.ElementInternals;
    HTMLElement.prototype.attachInternals = () =>
      new PolyfilledElementInternals() as unknown as ElementInternals;
    const supportsNativeElementInternals = await loadProbe();
    expect(supportsNativeElementInternals()).toBe(false);
  });

  it("returns false without ElementInternals", async () => {
    window.ElementInternals =
      undefined as unknown as typeof window.ElementInternals;
    const supportsNativeElementInternals = await loadProbe();
    expect(supportsNativeElementInternals()).toBe(false);
  });

  it("returns false without attachInternals", async () => {
    HTMLElement.prototype.attachInternals =
      undefined as unknown as typeof originalAttachInternals;
    const supportsNativeElementInternals = await loadProbe();
    expect(supportsNativeElementInternals()).toBe(false);
  });

  it("probes on first use rather than on import", async () => {
    // Imported while support is present, so an eager probe would cache true.
    const supportsNativeElementInternals = await loadProbe();
    window.ElementInternals =
      undefined as unknown as typeof window.ElementInternals;
    expect(supportsNativeElementInternals()).toBe(false);
  });
});
