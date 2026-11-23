import type { LovelaceElementConfig } from "../../elements/types";

// A percentage, or a unitless zero.
const POSITION = /^([+-]?(\d+(\.\d*)?|\.\d+)%|0)$/;

// Whether the editor can move the element by writing percent `left`/`top`.
// Other placements (another `position`, `right`/`bottom`/`inset*`, px or
// calc() values) are left alone rather than converted. Conditional elements
// only wrap their children.
export const isMovableElement = (config: LovelaceElementConfig): boolean => {
  const style: unknown = config.style ?? {};
  if (
    config.type === "conditional" ||
    typeof style !== "object" ||
    Array.isArray(style)
  ) {
    return false;
  }
  // YAML can hold numbers or null here, and CSS ignores the key case.
  for (const [key, raw] of Object.entries(style as Record<string, unknown>)) {
    const prop = key.toLowerCase();
    const value = raw == null ? "" : String(raw).trim().toLowerCase();
    if (prop === "left" || prop === "top") {
      if (key !== prop || (value && !POSITION.test(value))) {
        return false;
      }
    } else if (prop === "position") {
      if (value && value !== "absolute") {
        return false;
      }
    } else if (
      (prop === "right" || prop === "bottom" || prop.startsWith("inset")) &&
      value
    ) {
      return false;
    }
  }
  return true;
};
