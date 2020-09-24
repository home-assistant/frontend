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
import { SummaryBadgeConfig } from "./types";

@customElement("hui-summary-badge")
export class HuiSummaryBadge extends LitElement implements LovelaceBadge {
  @property({ attribute: false }) public hass?: HomeAssistant;

  @property() protected _config?: SummaryBadgeConfig;

  public setConfig(config: SummaryBadgeConfig): void {
    this._config = {
      icon: "hass:lightbulb-group",
      domain: "light",
      state: "on",
      ...config,
    };
  }

  protected render(): TemplateResult {
    if (!this._config || !this.hass) {
      return html``;
    }

    const states: string[] = [];

    for (const entity of Object.keys(this.hass.states)) {
      if (
        (!this._config.exclude || !this._config.exclude.includes(entity)) &&
        computeDomain(entity) === this._config.domain &&
        this.hass.states[entity].state === this._config.state
      )
        states.push(entity);
    }

    if (states.length === 0 && !this._config.show_always) {
      return html``;
    }

    return html`
      <ha-label-badge
        .icon=${this._config.icon}
        .description="${states.length} ${this._config.name ||
        this._config.domain}${states.length !== 1 ? "s" : ""} ${this._config
          .state}"
        .image=${this._config.image}
      ></ha-label-badge>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "hui-summary-badge": HuiSummaryBadge;
  }
}
