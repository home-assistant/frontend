import { css, CSSResultGroup, html, LitElement, TemplateResult } from "lit";
import { customElement, property, state } from "lit/decorators";
import { HomeAssistant } from "../../../../types";
import { LovelaceCard } from "../../types";
import { EnergyDevicesGraphCardConfig } from "../types";
import "../../components/hui-energy-period-selector";

@customElement("hui-energy-date-selection-card")
export class HuiEnergyDateSelectionCard
  extends LitElement
  implements LovelaceCard
{
  @property({ attribute: false }) public hass!: HomeAssistant;

  @state() private _config?: EnergyDevicesGraphCardConfig;

  public getCardSize(): Promise<number> | number {
    return 1;
  }

  public setConfig(config: EnergyDevicesGraphCardConfig): void {
    this._config = config;
  }

  protected render(): TemplateResult {
    if (!this.hass || !this._config) {
      return html``;
    }

    return html`
      <hui-energy-period-selector
        .hass=${this.hass}
        .collectionKey=${this._config.collection_key}
      ></hui-energy-period-selector>
    `;
  }

  static get styles(): CSSResultGroup {
    return css``;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "hui-energy-date-selection-card": HuiEnergyDateSelectionCard;
  }
}
