import type { PropertyValues } from "lit";
import { LitElement, css, html, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import "../../../../components/ha-card";
import type { HomeAssistant } from "../../../../types";
import { hasConfigChanged } from "../../common/has-changed";
import "../../components/hui-energy-period-selector";
import type { LovelaceCard, LovelaceGridOptions } from "../../types";
import type { EnergyDateSelectorCardConfig } from "../types";

@customElement("hui-energy-date-selection-card")
export class HuiEnergyDateSelectionCard
  extends LitElement
  implements LovelaceCard
{
  @property({ attribute: false }) public hass!: HomeAssistant;

  @state() private _config?: EnergyDateSelectorCardConfig;

  public getCardSize(): Promise<number> | number {
    return 1;
  }

  public getGridOptions(): LovelaceGridOptions {
    return {
      rows: 1,
      columns: 12,
    };
  }

  public setConfig(config: EnergyDateSelectorCardConfig): void {
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

    const verticalOpeningDirection =
      this._config.vertical_opening_direction === "auto"
        ? undefined
        : this._config.vertical_opening_direction;

    const openingDirection =
      this._config.opening_direction === "auto"
        ? undefined
        : this._config.opening_direction;

    return html`
      <ha-card>
        <div class="card-content">
          <hui-energy-period-selector
            .hass=${this.hass}
            .collectionKey=${this._config.collection_key}
            .verticalOpeningDirection=${verticalOpeningDirection}
            .openingDirection=${openingDirection}
            .allowCompare=${!this._config.disable_compare}
          ></hui-energy-period-selector>
        </div>
      </ha-card>
    `;
  }

  static styles = css`
    ha-card {
      height: 100%;
      display: flex;
      flex-direction: column;
      justify-content: center;
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    "hui-energy-date-selection-card": HuiEnergyDateSelectionCard;
  }
}
