import {
  customElement,
  LitElement,
  html,
  property,
  TemplateResult,
} from "lit-element";

import "../components/hui-buttons-base";

import {
  ButtonsRowConfig,
  EntityConfig,
  LovelaceRow,
} from "../entity-rows/types";
import { processConfigEntities } from "../common/process-config-entities";
import { HomeAssistant } from "../../../types";

@customElement("hui-buttons-row")
export class HuiButtonsRow extends LitElement implements LovelaceRow {
  public static getStubConfig(): object {
    return { entities: [] };
  }

  @property() public hass?: HomeAssistant;
  private _configEntities?: EntityConfig[];

  public setConfig(config: ButtonsRowConfig): void {
    this._configEntities = processConfigEntities(config.entities);
    this.requestUpdate();
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
