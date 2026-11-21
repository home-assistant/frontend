export const bytesToString = (value = 0, decimals = 2): string => {
  if (value === 0) {
    return "0 Bytes";
  }
  const k = 1024;
  decimals = decimals < 0 ? 0 : decimals;
  const sizes = ["Bytes", "KB", "MB", "GB", "TB", "PB", "EB", "ZB", "YB"];
  let i = Math.floor(Math.log(value) / Math.log(k));
  let rounded = parseFloat((value / k ** i).toFixed(decimals));
  // Rounding can reach the next unit, e.g. 1048575 bytes is 1024.00 KB.
  if (rounded >= k && i < sizes.length - 1) {
    i++;
    rounded = parseFloat((value / k ** i).toFixed(decimals));
  }
  return `${rounded} ${sizes[i]}`;
};
