import {
  customElement,
  html,
  LitElement,
  property,
  TemplateResult,
  internalProperty,
} from "lit-element";
import { HomeAssistant } from "../../../types";
import { processConfigEntities } from "../common/process-config-entities";
import "../components/hui-buttons-base";
import { EntityConfig } from "../entity-rows/types";
import { LovelaceHeaderFooter } from "../types";
import { ButtonsHeaderFooterConfig } from "./types";

@customElement("hui-buttons-header-footer")
export class HuiButtonsHeaderFooter extends LitElement
  implements LovelaceHeaderFooter {
  public static getStubConfig(): object {
    return { entities: [] };
  }

  @property({ attribute: false }) public hass?: HomeAssistant;

  @internalProperty() private _configEntities?: EntityConfig[];

  public getCardSize(): number {
    return 1;
  }

  public setConfig(config: ButtonsHeaderFooterConfig): void {
    this._configEntities = processConfigEntities(config.entities).map(
      (entityConfig) => ({
        tap_action: { action: "toggle" },
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
    "hui-buttons-header-footer": HuiButtonsHeaderFooter;
  }
}
