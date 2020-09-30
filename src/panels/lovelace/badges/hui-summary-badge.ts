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
    if (!config.domain && !config.group) {
      throw new Error("domain or group must be defined.");
    }

    if (config.group && !config.domain && !config.name) {
      throw new Error("name must be defined if using a group with no domain.");
    }

    this._config = {
      state: "on",
      icon: domainIcon(config.domain || "default", config.state || "on"),
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
        ((!this._config!.group &&
          computeDomain(entity.entity_id) === this._config!.domain) ||
          (this._config!.group &&
            (!this._config!.domain ||
              computeDomain(entity.entity_id) === this._config!.domain) &&
            this.hass!.states[this._config!.group] &&
            this.hass!.states[
              this._config!.group
            ].attributes.entity_id.includes(entity.entity_id) &&
            entity.state === this._config!.state!))
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
