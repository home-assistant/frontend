import { html, LitElement, TemplateResult } from "lit";
import { customElement, property, state } from "lit/decorators";
import { DOMAINS_TOGGLE } from "../../../common/const";
import { computeDomain } from "../../../common/entity/compute_domain";
import { HomeAssistant } from "../../../types";
import { processConfigEntities } from "../common/process-config-entities";
import "../components/hui-buttons-base";
import {
  ButtonsRowConfig,
  EntityConfig,
  LovelaceRow,
} from "../entity-rows/types";

@customElement("hui-buttons-row")
export class HuiButtonsRow extends LitElement implements LovelaceRow {
  public static getStubConfig(): Record<string, unknown> {
    return { entities: [] };
  }

  @property({ attribute: false }) public hass?: HomeAssistant;

  @state() private _configEntities?: EntityConfig[];

  public setConfig(config: ButtonsRowConfig): void {
    this._configEntities = processConfigEntities(config.entities).map(
      (entityConfig) => ({
        tap_action: {
          action:
            entityConfig.entity &&
            DOMAINS_TOGGLE.has(computeDomain(entityConfig.entity))
              ? "toggle"
              : "more-info",
        },
        hold_action: { action: "more-info" },
        ...entityConfig,
      })
    );
  }

  protected render(): TemplateResult | void {
    return html`
      <hui-buttons-base
        .hass=${this.hass}
        .configEntities=${this._configEntities}
      ></hui-buttons-base>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "hui-buttons-row": HuiButtonsRow;
  }
}
