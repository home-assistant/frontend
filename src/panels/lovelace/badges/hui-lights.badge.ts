import {
  customElement,
  html,
  LitElement,
  TemplateResult,
  property,
} from "lit-element";
import { computeDomain } from "../../../common/entity/compute_domain";
import "../../../components/ha-label-badge";
import { HomeAssistant } from "../../../types";
import { LovelaceBadge } from "../types";
import { LightsBadgeConfig } from "./types";

@customElement("hui-lights-badge")
export class HuiLightsBadge extends LitElement implements LovelaceBadge {
  @property({ attribute: false }) public hass?: HomeAssistant;

  @property() protected _config?: LightsBadgeConfig;

  public setConfig(config: LightsBadgeConfig): void {
    this._config = { icon: "hass:lightbulb-group", ...config };
  }

  protected render(): TemplateResult {
    if (!this._config || !this.hass) {
      return html``;
    }

    const states: string[] = [];

    for (const entity of Object.keys(this.hass.states)) {
      if (
        (!this._config.exclude || !this._config.exclude.includes(entity)) &&
        computeDomain(entity) === "light" &&
        this.hass.states[entity].state === "on"
      )
        states.push(entity);
    }

    if (states.length === 0 && !this._config.show_always) {
      return html``;
    }

    return html`
      <ha-label-badge
        .icon=${this._config.icon}
        .description="${states.length} Lights On"
        .image=${this._config.image}
      ></ha-label-badge>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "hui-lights-badge": HuiLightsBadge;
  }
}
