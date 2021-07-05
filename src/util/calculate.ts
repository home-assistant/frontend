export const normalize = (value: number, min: number, max: number): number => {
  if (isNaN(value) || isNaN(min) || isNaN(max)) {
    // Not a number, return 0
    return 0;
  }
  if (value > max) return max;
  if (value < min) return min;
  return value;
};

export const getValueInPercentage = (
  value: number,
  min: number,
  max: number
): number => {
  const newMax = max - min;
  const newVal = value - min;
  return (100 * newVal) / newMax;
};

export const roundWithOneDecimal = (value: number): number =>
  Math.round(value * 10) / 10;
