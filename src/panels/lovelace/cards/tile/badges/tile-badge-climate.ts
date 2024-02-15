import { html, nothing } from "lit";
import { styleMap } from "lit/directives/style-map";
import { stateColorCss } from "../../../../../common/entity/state_color";
import "../../../../../components/ha-attribute-icon";
import "../../../../../components/tile/ha-tile-badge";
import {
  CLIMATE_HVAC_ACTION_TO_MODE,
  ClimateEntity,
} from "../../../../../data/climate";
import { RenderBadgeFunction } from "./tile-badge";

export const renderClimateBadge: RenderBadgeFunction = (stateObj, hass) => {
  const hvacAction = (stateObj as ClimateEntity).attributes.hvac_action;

  if (!hvacAction || hvacAction === "off") {
    return nothing;
  }

  return html`
    <ha-tile-badge
      style=${styleMap({
        "--tile-badge-background-color": stateColorCss(
          stateObj,
          CLIMATE_HVAC_ACTION_TO_MODE[hvacAction]
        ),
      })}
    >
      <ha-attribute-icon
        .hass=${hass}
        .stateObj=${stateObj}
        attribute="hvac_action"
      >
      </ha-attribute-icon>
    </ha-tile-badge>
  `;
};
