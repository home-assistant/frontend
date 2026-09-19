import type { NativeModalOrigin } from "./external_messaging";

/**
 * Where an event asking for a native modal came from, for an app that grows the
 * modal out of it. The first entry of the composed path is the element the event
 * was fired on: the card or row that decided to open it, not the icon under the
 * finger. Nothing comes back for a deep link or a shortcut, which has no box.
 */
export const computeNativeModalOrigin = (
  ev: Event
): NativeModalOrigin | undefined => {
  const source = ev.composedPath()[0];
  if (!(source instanceof Element)) {
    return undefined;
  }
  const { x, y, width, height } = source.getBoundingClientRect();
  if (!width || !height) {
    return undefined;
  }
  return {
    x: Math.round(x),
    y: Math.round(y),
    width: Math.round(width),
    height: Math.round(height),
  };
};
