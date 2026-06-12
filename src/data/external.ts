export const isExternal =
  window.externalAppV2 ||
  window.externalApp ||
  window.webkit?.messageHandlers?.getExternalAuth ||
  location.search.includes("external_auth=1");
export const isExternalAndroid = window.externalApp || window.externalAppV2;
