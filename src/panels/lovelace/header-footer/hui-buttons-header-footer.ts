import {
  customElement,
  LitElement,
  html,
  property,
  TemplateResult,
} from "lit-element";

import "../components/hui-buttons-base";

import { LovelaceHeaderFooter } from "../types";
import { ButtonsHeaderFooterConfig } from "./types";
import { processConfigEntities } from "../common/process-config-entities";
import { EntityConfig } from "../entity-rows/types";
import { HomeAssistant } from "../../../types";

@customElement("hui-buttons-header-footer")
export class HuiButtonsHeaderFooter extends LitElement
  implements LovelaceHeaderFooter {
  public static getStubConfig(): object {
    return { entities: [] };
  }

  @property() public hass?: HomeAssistant;
  private _configEntities?: EntityConfig[];

  public setConfig(config: ButtonsHeaderFooterConfig): void {
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
    "hui-buttons-header-footer": HuiButtonsHeaderFooter;
  }
}
