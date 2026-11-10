export const isExternalHassUrl = (): boolean =>
  Boolean(__HASS_URL__) && __HASS_URL__ !== location.origin;

export const resolveHassUrl = (path: string): string =>
  isExternalHassUrl() ? new URL(path, __HASS_URL__).toString() : path;
