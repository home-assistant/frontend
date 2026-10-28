/**
 * `ignore` option for tinykeys that lets held navigation keys repeat, like the
 * arrow keys in lists do. Repeated Enter and Space stay ignored, so holding
 * them does not activate the same row again.
 */
export const ignoreRepeatedActivation = (ev: KeyboardEvent): boolean =>
  ev.isComposing || (ev.repeat && (ev.key === "Enter" || ev.key === " "));
