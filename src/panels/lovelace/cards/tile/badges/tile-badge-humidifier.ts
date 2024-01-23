import { html, nothing } from "lit";
import { styleMap } from "lit/directives/style-map";
import { stateColorCss } from "../../../../../common/entity/state_color";
import "../../../../../components/ha-attribute-icon";
import "../../../../../components/tile/ha-tile-badge";
import {
  HUMIDIFIER_ACTION_MODE,
  HumidifierEntity,
} from "../../../../../data/humidifier";
import { RenderBadgeFunction } from "./tile-badge";

export const renderHumidifierBadge: RenderBadgeFunction = (stateObj, hass) => {
  const action = (stateObj as HumidifierEntity).attributes.action;

  if (!action || action === "off") {
    return nothing;
  }

  return html`
    <ha-tile-badge
      style=${styleMap({
        "--tile-badge-background-color": stateColorCss(
          stateObj,
          HUMIDIFIER_ACTION_MODE[action]
        ),
      })}
    >
      <ha-attribute-icon .hass=${hass} .stateObj=${stateObj} attribute="action">
      </ha-attribute-icon>
    </ha-tile-badge>
  `;
};
