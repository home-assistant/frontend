let supported: boolean | undefined;

const detect = (): boolean => {
  if (
    !globalThis.ElementInternals ||
    !globalThis.HTMLElement?.prototype.attachInternals
  ) {
    return false;
  }
  // Native internals keep their WebIDL brand even when `attachInternals` is
  // wrapped (e.g. by `@webcomponents/scoped-custom-element-registry`, which
  // broke the previous `[native code]` source check in the app bundle).
  // `element-internals-polyfill` swaps in a plain class, which has no brand,
  // and must not count as native: login on legacy browsers relies on
  // validation being skipped there (#51338).
  return (
    Object.prototype.toString.call(globalThis.ElementInternals.prototype) ===
    "[object ElementInternals]"
  );
};

/**
 * Indicates whether the current browser has native ElementInternals support.
 * Probed on first use so importing this module has no side effects.
 */
export const supportsNativeElementInternals = (): boolean => {
  supported ??= detect();
  return supported;
};
