const SWIPE_LOCKED_COMPONENTS = new Set([
  "ha-control-slider",
  "ha-slider",
  "ha-control-switch",
  "ha-control-circular-slider",
  "ha-hs-color-picker",
  "ha-map",
  "ha-more-info-control-select-container",
  "ha-filter-chip",
]);

const SWIPE_LOCKED_CLASSES = new Set(["volume-slider-container", "forecast"]);

/**
 * Whether a touch inside a bottom sheet belongs to its content rather than to
 * the sheet: it started in something scrolled away from its top, or in a
 * control that drags on its own. Only the path up to the sheet is checked.
 */
export const isSwipeLocked = (
  path: EventTarget[],
  sheet: EventTarget
): boolean => {
  for (const target of path) {
    if (target === sheet) {
      return false;
    }
    if (
      target instanceof HTMLElement &&
      (target.scrollTop > 0 ||
        SWIPE_LOCKED_COMPONENTS.has(target.localName) ||
        Array.from(target.classList).some((cls) =>
          SWIPE_LOCKED_CLASSES.has(cls)
        ))
    ) {
      return true;
    }
  }
  return false;
};
