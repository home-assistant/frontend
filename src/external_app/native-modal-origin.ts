import type { NativeModalOrigin } from "./external_messaging";

/**
 * Where an event asking for a native modal came from, for an app that grows the
 * modal out of it.
 *
 * The first entry of the composed path is the element the event was fired on,
 * which for a request to open something is the card, row or badge that decided
 * to open it, rather than whichever icon inside it the finger landed on. That
 * is the shape the modal should come from.
 *
 * Returns nothing when the event came from something with no box on screen, as
 * a deep link or a keyboard shortcut does, so the app falls back to its plain
 * presentation.
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
