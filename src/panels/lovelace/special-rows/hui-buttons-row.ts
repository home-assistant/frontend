import type { HomeAssistant } from "../../../types";
import type {
  ButtonsRowConfig,
  EntityConfig,
  LovelaceRow,
} from "../entity-rows/types";
import type { TemplateResult } from "lit";

import "../components/hui-buttons-base";

import { html, LitElement } from "lit";
import { customElement, property, state } from "lit/decorators";

import { DOMAINS_TOGGLE } from "../../../common/const";
import { computeDomain } from "../../../common/entity/compute_domain";
import { processConfigEntities } from "../common/process-config-entities";

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

  protected render(): TemplateResult | undefined {
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
