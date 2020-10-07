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

export const roundWithOneDecimal = (value: number): number => {
  return Math.round(value * 10) / 10;
};

export const bytesToString = (value = 0, decimals = 2): string => {
    if (value === 0) return '0 Bytes';
    const k = 1024;
    decimals = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];
    const i = Math.floor(Math.log(value) / Math.log(k));
    return `${parseFloat((value / k ** i).toFixed(decimals))} ${sizes[i]}`;
}
