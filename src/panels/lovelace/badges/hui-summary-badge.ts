import {
  customElement,
  html,
  LitElement,
  TemplateResult,
  property,
} from "lit-element";
import { computeDomain } from "../../../common/entity/compute_domain";
import { domainIcon } from "../../../common/entity/domain_icon";
import "../../../components/ha-label-badge";
import { HomeAssistant } from "../../../types";
import { LovelaceBadge } from "../types";
import { SummaryBadgeConfig } from "./types";

@customElement("hui-summary-badge")
export class HuiSummaryBadge extends LitElement implements LovelaceBadge {
  @property({ attribute: false }) public hass?: HomeAssistant;

  @property() protected _config?: SummaryBadgeConfig;

  public setConfig(config: SummaryBadgeConfig): void {
    if (!config.domain) {
      throw new Error("Domain must be defined.");
    }

    this._config = {
      icon: domainIcon(config.domain),
      state: "on",
      ...config,
    };
  }

  protected render(): TemplateResult {
    if (!this._config || !this.hass) {
      return html``;
    }

    const states = Object.values(this.hass.states).filter(
      (entity) =>
        (!this._config!.exclude ||
          !this._config!.exclude.includes(entity.entity_id)) &&
        computeDomain(entity.entity_id) === this._config!.domain &&
        entity.state === this._config!.state!
    );

    if (states.length === 0 && !this._config.show_always) {
      return html``;
    }

    return html`
      <ha-label-badge
        .icon=${this._config.icon}
        .description="${states.length} ${this._config.name ||
        this._config.domain}(s) ${this._config.state}"
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
