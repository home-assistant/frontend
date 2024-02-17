export const isTouch =
  "ontouchstart" in window ||
  navigator.maxTouchPoints > 0 ||
  // @ts-ignore
  navigator.msMaxTouchPoints > 0;
