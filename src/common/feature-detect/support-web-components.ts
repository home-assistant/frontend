export const webComponentsSupported =
  "customElements" in window && "content" in document.createElement("template");
