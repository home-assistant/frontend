export const isExternal =
  window.externalApp ||
  window.webkit?.messageHandlers?.getExternalAuth ||
  location.search.includes("external_auth=1");
