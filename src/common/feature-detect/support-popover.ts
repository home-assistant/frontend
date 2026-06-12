/**
 * Indicates whether the current browser supports the Popover API.
 *
 * @see https://developer.mozilla.org/en-US/docs/Web/API/Popover_API
 */
export const popoverSupported = globalThis?.HTMLElement?.prototype
  ? Object.prototype.hasOwnProperty.call(
      globalThis.HTMLElement.prototype,
      "popover"
    )
  : false;
