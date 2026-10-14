import { mdiHome, mdiHomeExportOutline } from "@mdi/js";
import { html } from "lit";
import { styleMap } from "lit/directives/style-map";
import { stateColorCss } from "../../../../../common/entity/state_color";
import "../../../../../components/ha-icon";
import "../../../../../components/ha-svg-icon";
import "../../../../../components/tile/ha-tile-badge";
import { getEntityActiveZone } from "../../../../../data/zone";
import type { RenderBadgeFunction } from "./tile-badge";

export const renderPersonBadge: RenderBadgeFunction = (stateObj, hass) => {
  const zone =
    stateObj.state === "home"
      ? undefined
      : getEntityActiveZone(stateObj, hass.states);

  const zoneIcon = zone?.attributes.icon;

  if (zoneIcon) {
    return html`
      <ha-tile-badge
        style=${styleMap({
          "--tile-badge-background-color": stateColorCss(stateObj),
        })}
      >
        <ha-icon .icon=${zoneIcon}></ha-icon>
      </ha-tile-badge>
    `;
  }

  const defaultIcon =
    stateObj.state === "not_home" ? mdiHomeExportOutline : mdiHome;

  return html`
    <ha-tile-badge
      style=${styleMap({
        "--tile-badge-background-color": stateColorCss(stateObj),
      })}
    >
      <ha-svg-icon .path=${defaultIcon}></ha-svg-icon>
    </ha-tile-badge>
  `;
};
