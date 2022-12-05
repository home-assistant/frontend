export const clamp = (value: number, min: number, max: number) =>
  Math.min(Math.max(value, min), max);

// Variant that only applies the clamping to a border if the border is defined
export const conditionalClamp = (value: number, min?: number, max?: number) => {
  let result: number;
  result = min ? Math.max(value, min) : value;
  result = max ? Math.min(result, max) : result;
  return result;
};
