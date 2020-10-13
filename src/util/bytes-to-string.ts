export const bytesToString = (value = 0, decimals = 2): string => {
  if (value === 0) {
    return "0 Bytes";
  }
  const k = 1024;
  decimals = decimals < 0 ? 0 : decimals;
  const sizes = ["Bytes", "KB", "MB", "GB", "TB", "PB", "EB", "ZB", "YB"];
  const i = Math.floor(Math.log(value) / Math.log(k));
  return `${parseFloat((value / k ** i).toFixed(decimals))} ${sizes[i]}`;
};
