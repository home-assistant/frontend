/**
 * Indicates whether the current browser has native ElementInternals support.
 */
export const nativeElementInternalsSupported =
  Boolean(globalThis.ElementInternals) &&
  globalThis.HTMLElement?.prototype.attachInternals
    ?.toString()
    .includes("[native code]");
