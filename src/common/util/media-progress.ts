export const startMediaProgressInterval = (
  interval: number | undefined,
  callback: () => void,
  intervalMs = 1000
): number => {
  if (interval) {
    return interval;
  }
  return window.setInterval(callback, intervalMs);
};

export const stopMediaProgressInterval = (
  interval: number | undefined
): number | undefined => {
  if (interval) {
    clearInterval(interval);
  }
  return undefined;
};
