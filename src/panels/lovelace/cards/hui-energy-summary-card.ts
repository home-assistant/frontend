import { mdiCashMultiple } from "@mdi/js";
import { css, html, LitElement } from "lit";
import { customElement, property, state } from "lit/decorators";
import "../../../components/ha-svg-icon";
import { HomeAssistant } from "../../../types";
import { LovelaceCard } from "../types";
import { EnergySummaryCardConfig } from "./types";

@customElement("hui-energy-summary-card")
class HuiEnergySummaryCard extends LitElement implements LovelaceCard {
  @property({ attribute: false }) public hass?: HomeAssistant;

  @state() private _config?: EnergySummaryCardConfig;

  public setConfig(config: EnergySummaryCardConfig): void {
    this._config = config;
  }

  public getCardSize(): Promise<number> | number {
    return 3;
  }

  protected render() {
    if (!this._config || !this.hass) {
      return html``;
    }

    return html`
      <ha-card header="Today">
        <div class="card-content">
          <div class="row">
            <ha-svg-icon .path=${mdiCashMultiple}></ha-svg-icon>
            <div class="label">
              Ratio own production / consumption from grid
            </div>
            <div class="data">23%</div>
          </div>

          <div class="row">
            <ha-svg-icon .path=${mdiCashMultiple}></ha-svg-icon>
            <div class="label">Total consumption of today</div>
            <div class="data">23%</div>
          </div>

          <div class="row">
            <ha-svg-icon .path=${mdiCashMultiple}></ha-svg-icon>
            <div class="label">Total production of today</div>
            <div class="data">23%</div>
          </div>

          <div class="row">
            <ha-svg-icon .path=${mdiCashMultiple}></ha-svg-icon>
            <div class="label">Total costs of today</div>
            <div class="data">23%</div>
          </div>

          <div class="row">
            <ha-svg-icon .path=${mdiCashMultiple}></ha-svg-icon>
            <div class="label">Total cost saved by solar panels</div>
            <div class="data">23%</div>
          </div>

          <div class="row">
            <ha-svg-icon .path=${mdiCashMultiple}></ha-svg-icon>
            <div class="label">
              If you have tariffs it should show the current tariff and what
              time will it change
            </div>
            <div class="data">23%</div>
          </div>
        </div>
      </ha-card>
    `;
  }

  static styles = css`
    .row {
      display: flex;
      align-items: center;
      color: var(--primary-text-color);
    }
    ha-svg-icon {
      padding: 8px;
      color: var(--paper-item-icon-color);
    }
    div {
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    .label {
      flex: 1;
      margin-left: 16px;
    }
    .data {
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    "hui-energy-summary-card": HuiEnergySummaryCard;
  }
}
