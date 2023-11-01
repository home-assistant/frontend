import { html, LitElement, nothing, css, CSSResultGroup } from "lit";
import { customElement, property, state } from "lit/decorators";
import { HomeAssistant } from "../../../../types";
import "../../components/hui-energy-period-selector";
import { LovelaceCard } from "../../types";
import { EnergyCardBaseConfig } from "../types";

@customElement("hui-energy-date-selection-card")
export class HuiEnergyDateSelectionCard
  extends LitElement
  implements LovelaceCard
{
  @property({ attribute: false }) public hass!: HomeAssistant;

  @state() private _config?: EnergyCardBaseConfig;

  public getCardSize(): Promise<number> | number {
    return 1;
  }

  public setConfig(config: EnergyCardBaseConfig): void {
    this._config = config;
  }

  protected render() {
    if (!this.hass || !this._config) {
      return nothing;
    }

    return html`
      <ha-card>
        <div class="card-content">
          <hui-energy-period-selector
            .hass=${this.hass}
            .collectionKey=${this._config.collection_key}
          ></hui-energy-period-selector>
        </div>
      </ha-card>
    `;
  }

  static get styles(): CSSResultGroup {
    return css`
      .padded {
        padding-left: 16px !important;
      }
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "hui-energy-date-selection-card": HuiEnergyDateSelectionCard;
  }
}
