import type { LovelaceElementConfig } from "../../elements/types";

// A percentage, or a unitless zero.
const POSITION = /^([+-]?(\d+(\.\d*)?|\.\d+)%|0)$/;

const SIDES = ["left", "right", "top", "bottom"];

// The sides of the image an element is placed from.
export interface ElementAnchors {
  x: "left" | "right";
  y: "top" | "bottom";
}

// Distances in percent of the image, keyed by the side they are taken from.
export type ElementPosition = Partial<
  Record<ElementAnchors["x"] | ElementAnchors["y"], number>
>;

// The sides the editor can move the element along by writing percent values
// to them: per axis the one the style sets, else left/top. Other placements
// (another `position`, both sides of an axis, `inset*`, px or calc() values)
// are left alone rather than converted. Conditional elements only wrap their
// children.
export const elementAnchors = (
  config: LovelaceElementConfig
): ElementAnchors | undefined => {
  const style: unknown = config.style ?? {};
  if (
    config.type === "conditional" ||
    typeof style !== "object" ||
    Array.isArray(style)
  ) {
    return undefined;
  }
  const sides = new Set<string>();
  // Sides with an empty key in another case. The card applies the keys in
  // order, so such a key can remove the side the lowercase key sets.
  const cleared = new Set<string>();
  // YAML can hold numbers or null here, and CSS ignores the key case.
  for (const [key, raw] of Object.entries(style as Record<string, unknown>)) {
    const prop = key.toLowerCase();
    const value = raw == null ? "" : String(raw).trim().toLowerCase();
    if (SIDES.includes(prop)) {
      // An empty right or bottom is ignored in any key case.
      if (
        (key !== prop && (value || prop === "left" || prop === "top")) ||
        (value && !POSITION.test(value))
      ) {
        return undefined;
      }
      if (value) {
        sides.add(prop);
      } else if (key !== prop) {
        cleared.add(prop);
      }
    } else if (prop === "position") {
      if (value && value !== "absolute") {
        return undefined;
      }
    } else if (prop.startsWith("inset")) {
      // The card applies the keys in order, so an empty inset removes the
      // sides the keys before it set.
      if (value || (prop === "inset" && sides.size)) {
        return undefined;
      }
    }
  }
  if (
    (sides.has("left") && sides.has("right")) ||
    (sides.has("top") && sides.has("bottom")) ||
    [...cleared].some((side) => sides.has(side))
  ) {
    return undefined;
  }
  return {
    x: sides.has("right") ? "right" : "left",
    y: sides.has("bottom") ? "bottom" : "top",
  };
};

export const isMovableElement = (config: LovelaceElementConfig): boolean =>
  elementAnchors(config) !== undefined;

// The element's style with the position written to the sides it is placed
// from, rounded to 0.1 %. Undefined when it can't be moved there.
export const movedStyle = (
  config: LovelaceElementConfig,
  position: ElementPosition
): Record<string, string> | undefined => {
  const anchors = elementAnchors(config);
  const x = anchors && position[anchors.x];
  const y = anchors && position[anchors.y];
  if (!anchors || x === undefined || y === undefined) {
    return undefined;
  }
  const round = (value: number) => Math.round(value * 10) / 10;
  return {
    ...config.style,
    [anchors.x]: `${round(x)}%`,
    [anchors.y]: `${round(y)}%`,
  };
};
