import { mdiHome, mdiHomeExportOutline } from "@mdi/js";
import type { HassEntity } from "home-assistant-js-websocket";
import { html } from "lit";
import { styleMap } from "lit/directives/style-map";
import { stateColorCss } from "../../../../../common/entity/state_color";
import "../../../../../components/ha-icon";
import "../../../../../components/ha-svg-icon";
import "../../../../../components/tile/ha-tile-badge";
import { computeZoneTrackerState } from "../../../../../data/zone";
import type { HomeAssistant } from "../../../../../types";
import type { RenderBadgeFunction } from "./tile-badge";

function getZone(entity: HassEntity, hass: HomeAssistant) {
  const state = entity.state;
  if (state === "home" || state === "not_home") return undefined;

  // Zone names aren't unique, so check the zones the entity is in first
  const zoneIds: string[] = [
    ...(entity.attributes.in_zones ?? []),
    ...Object.keys(hass.states).filter((entityId) =>
      entityId.startsWith("zone.")
    ),
  ];

  return zoneIds
    .map((zoneId) => hass.states[zoneId])
    .find((zone) => zone && state === computeZoneTrackerState(zone));
}

export const renderPersonBadge: RenderBadgeFunction = (stateObj, hass) => {
  const zone = getZone(stateObj, hass);

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
