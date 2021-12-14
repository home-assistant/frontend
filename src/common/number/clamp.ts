export const clamp = (value: number, min: number, max: number) =>
  Math.min(Math.max(value, min), max);

// Variant that only applies the clamping to a border if the border is defined
export const conditionalClamp = (value: number, min?: number, max?: number) => {
  value = min ? Math.max(value, min) : value;
  value = max ? Math.min(value, max) : value;
  return value;
};
