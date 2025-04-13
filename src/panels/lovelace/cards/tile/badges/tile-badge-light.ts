import { html, nothing } from "lit";
import "../../../../../components/ha-attribute-icon";
import "../../../../../components/tile/ha-tile-badge";
import type { RenderBadgeFunction } from "./tile-badge";
import type { LightEntity } from "../../../../../data/light";

export const renderLightBadge: RenderBadgeFunction = (stateObj, hass) => {
  const lightEffect = (stateObj as LightEntity).attributes.effect;

  if (!lightEffect || ["off", "none"].includes(lightEffect.toLowerCase())) {
    return nothing;
  }

  return html`
    <ha-tile-badge>
      <ha-attribute-icon .hass=${hass} .stateObj=${stateObj} attribute="effect">
      </ha-attribute-icon>
    </ha-tile-badge>
  `;
};
