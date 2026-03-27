export const popoverSupported = globalThis?.HTMLElement?.prototype
  ? Object.prototype.hasOwnProperty.call(
      globalThis.HTMLElement.prototype,
      "popover"
    )
  : false;
