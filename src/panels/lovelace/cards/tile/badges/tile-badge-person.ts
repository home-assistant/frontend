import { mdiHome, mdiHomeExportOutline } from "@mdi/js";
import type { HassEntity } from "home-assistant-js-websocket";
import { html } from "lit";
import { styleMap } from "lit/directives/style-map";
import { stateColor } from "../../../../../common/entity/state_color";
import "../../../../../components/ha-icon";
import "../../../../../components/ha-svg-icon";
import "../../../../../components/tile/ha-tile-badge";
import type { HomeAssistant } from "../../../../../types";
import type { RenderBadgeFunction } from "./tile-badge";

function getZone(entity: HassEntity, hass: HomeAssistant) {
  const state = entity.state;
  if (state === "home" || state === "not_home") return undefined;

  const zones = Object.values(hass.states).filter((stateObj) =>
    stateObj.entity_id.startsWith("zone.")
  );

  return zones.find((z) => state === z.attributes.friendly_name);
}

export const renderPersonBadge: RenderBadgeFunction = (
  element,
  stateObj,
  hass
) => {
  const zone = getZone(stateObj, hass);

  const zoneIcon = zone?.attributes.icon;

  if (zoneIcon) {
    return html`
      <ha-tile-badge
        style=${styleMap({
          "--tile-badge-background-color": stateColor(element, stateObj),
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
        "--tile-badge-background-color": stateColor(element, stateObj),
      })}
    >
      <ha-svg-icon .path=${defaultIcon}></ha-svg-icon>
    </ha-tile-badge>
  `;
};
