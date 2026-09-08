import { getContrastedColorHex } from "../color/rgb";

/** The zone marker: a colored circle with the zone's icon or initials, shared by the map and the zone editor */

export const ZONE_CIRCLE_SIZE = 36;

// Content color contrasting the fill; not every theme color parses
export const contrastingZoneContent = (color: string): string => {
  try {
    return getContrastedColorHex(color.trim());
  } catch {
    return "#ffffff";
  }
};

export const zoneInitials = (name: string): string =>
  name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2);

export const createZoneMarkerElement = (options: {
  color: string;
  icon?: string;
  /** Path for an ha-svg-icon, when there is no icon name */
  iconPath?: string;
  name: string;
}): HTMLElement => {
  const element = document.createElement("div");
  element.className = "zone-circle";
  element.style.backgroundColor = options.color;
  element.style.color = contrastingZoneContent(options.color);
  if (options.icon) {
    const icon = document.createElement("ha-icon");
    icon.setAttribute("icon", options.icon);
    element.appendChild(icon);
  } else if (options.iconPath) {
    const icon = document.createElement("ha-svg-icon");
    icon.setAttribute("path", options.iconPath);
    element.appendChild(icon);
  } else {
    const initials = document.createElement("span");
    initials.textContent = zoneInitials(options.name);
    element.appendChild(initials);
  }
  return element;
};

/** Styles for the zone marker, included by ha-map */
export const zoneMarkerStyles = `
  .zone-circle {
    width: ${ZONE_CIRCLE_SIZE}px;
    height: ${ZONE_CIRCLE_SIZE}px;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    border: 2px solid var(--card-background-color, #fff);
    box-sizing: border-box;
    box-shadow: var(--ha-box-shadow-s);
    overflow: hidden;
    font-size: var(--ha-font-size-s);
    font-weight: var(--ha-font-weight-medium);
    --mdc-icon-size: ${ZONE_CIRCLE_SIZE / 2}px;
  }
`;
