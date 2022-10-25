import {
  mdiClockOutline,
  mdiFire,
  mdiPower,
  mdiSnowflake,
  mdiWaterPercent,
} from "@mdi/js";
import { HassEntity } from "home-assistant-js-websocket";
import { css, CSSResultGroup, html, LitElement, TemplateResult } from "lit";
import { customElement, property } from "lit/decorators";
import { styleMap } from "lit/directives/style-map";
import "../../../../../components/tile/ha-tile-badge";
import { ClimateEntity, HvacAction } from "../../../../../data/climate";

export const CLIMATE_HVAC_ACTION_COLORS: Record<HvacAction, string> = {
  cooling: "var(--rgb-state-climate-cool-color)",
  drying: "var(--rgb-state-climate-dry-color)",
  heating: "var(--rgb-state-climate-heat-color)",
  idle: "var(--rgb-state-climate-idle-color)",
  off: "var(--rgb-state-climate-off-color)",
};

export const CLIMATE_HVAC_ACTION_ICONS: Record<HvacAction, string> = {
  cooling: mdiSnowflake,
  drying: mdiWaterPercent,
  heating: mdiFire,
  idle: mdiClockOutline,
  off: mdiPower,
};

@customElement("tile-badge-climate")
export class TileBadgeClimate extends LitElement {
  @property() public stateObj?: HassEntity;

  protected render(): TemplateResult {
    if (!this.stateObj) {
      return html``;
    }

    const hvacAction = (this.stateObj as ClimateEntity).attributes.hvac_action;

    if (!hvacAction || hvacAction === "off") {
      return html``;
    }

    const iconPath = CLIMATE_HVAC_ACTION_ICONS[hvacAction];
    const color = CLIMATE_HVAC_ACTION_COLORS[hvacAction];

    const style = {
      "--badge-color": color,
    };

    return html`
      <ha-tile-badge
        style=${styleMap(style)}
        .iconPath=${iconPath}
      ></ha-tile-badge>
    `;
  }

  static get styles(): CSSResultGroup {
    return css`
      ha-tile-badge {
        --tile-badge-background-color: rgb(var(--badge-color));
      }
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "tile-badge-climate": TileBadgeClimate;
  }
}
