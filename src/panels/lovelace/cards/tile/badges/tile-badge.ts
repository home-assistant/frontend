import { mdiExclamationThick } from "@mdi/js";
import type { HassEntity } from "home-assistant-js-websocket";
import type { TemplateResult } from "lit";
import { html, nothing } from "lit";
import { styleMap } from "lit/directives/style-map";
import { computeDomain } from "../../../../../common/entity/compute_domain";
import { UNAVAILABLE, UNKNOWN } from "../../../../../data/entity";
import type { HomeAssistant } from "../../../../../types";
import { renderClimateBadge } from "./tile-badge-climate";
import { renderHumidifierBadge } from "./tile-badge-humidifier";
import { renderPersonBadge } from "./tile-badge-person";
import "../../../../../components/tile/ha-tile-badge";
import "../../../../../components/ha-svg-icon";

export type RenderBadgeFunction = (
  element: HTMLElement,
  stateObj: HassEntity,
  hass: HomeAssistant
) => TemplateResult | typeof nothing;

export const renderTileBadge: RenderBadgeFunction = (
  element,
  stateObj,
  hass
) => {
  if (stateObj.state === UNKNOWN) {
    return nothing;
  }
  if (stateObj.state === UNAVAILABLE) {
    return html`
      <ha-tile-badge
        style=${styleMap({
          "--tile-badge-background-color": "var(--orange-color)",
        })}
      >
        <ha-svg-icon .path=${mdiExclamationThick}></ha-svg-icon>
      </ha-tile-badge>
    `;
  }
  const domain = computeDomain(stateObj.entity_id);
  switch (domain) {
    case "person":
    case "device_tracker":
      return renderPersonBadge(element, stateObj, hass);
    case "climate":
      return renderClimateBadge(element, stateObj, hass);
    case "humidifier":
      return renderHumidifierBadge(element, stateObj, hass);
    default:
      return nothing;
  }
};
