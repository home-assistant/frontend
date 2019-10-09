import { HassEntity } from "home-assistant-js-websocket";

export const computeColor = (
  stateObj?: HassEntity,
  iconColor?: string
): string => {
  if (iconColor) {
    return iconColor;
  }

  if (!stateObj || !stateObj.attributes.hs_color) {
    return "";
  }
  const [hue, sat] = stateObj.attributes.hs_color;
  if (sat <= 10) {
    return "";
  }
  return `hsl(${hue}, 100%, ${100 - sat / 2}%)`;
};
