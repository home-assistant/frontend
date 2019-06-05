export const createCustomPanelElement = (panelConfig) => {
  // Legacy support. Custom panels used to have to define element ha-panel-{name}
  const tagName =
    "html_url" in panelConfig
      ? `ha-panel-${panelConfig.name}`
      : panelConfig.name;
  return document.createElement(tagName);
};
