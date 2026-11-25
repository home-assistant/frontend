export const isAndroidDevice = (): boolean =>
  /android/i.test(navigator.userAgent);
