export const clamp = (value: number, min: number, max: number) =>
  Math.min(Math.max(value, min), max);

// Variant that only applies the clamping to a border if the border is defined
export const conditionalClamp = (value: number, min?: number, max?: number) => {
  const clampedMin = min != null ? Math.max(value, min) : value;
  return max != null ? Math.min(clampedMin, max) : clampedMin;
};