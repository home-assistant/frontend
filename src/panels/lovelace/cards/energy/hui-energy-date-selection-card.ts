import {
  CSSResultGroup,
  LitElement,
  PropertyValues,
  css,
  html,
  nothing,
} from "lit";
import { customElement, property, state } from "lit/decorators";
import { HomeAssistant } from "../../../../types";
import { hasConfigChanged } from "../../common/has-changed";
import "../../components/hui-energy-period-selector";
import { LovelaceCard, LovelaceLayoutOptions } from "../../types";
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

  public getLayoutOptions(): LovelaceLayoutOptions {
    return {
      grid_rows: 1,
      grid_columns: 4,
    };
  }

  public setConfig(config: EnergyCardBaseConfig): void {
    this._config = config;
  }

  protected shouldUpdate(changedProps: PropertyValues): boolean {
    return (
      hasConfigChanged(this, changedProps) ||
      changedProps.size > 1 ||
      !changedProps.has("hass")
    );
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
    :host {
      ha-card {
        height: 100%;
        display: flex;
        flex-direction: column;
        justify-content: center;
      }
      .padded {
        padding-left: 16px !important;
        padding-inline-start: 16px !important;
        padding-inline-end: initial !important;
      }
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "hui-energy-date-selection-card": HuiEnergyDateSelectionCard;
  }
}
