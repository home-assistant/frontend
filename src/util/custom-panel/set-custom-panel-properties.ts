export const setCustomPanelProperties = (root, properties) => {
  if ("setProperties" in root) {
    root.setProperties(properties);
  } else {
    Object.keys(properties).forEach((key) => {
      root[key] = properties[key];
    });
  }
};
