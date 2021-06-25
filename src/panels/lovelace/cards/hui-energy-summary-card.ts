import { mdiCashMultiple } from "@mdi/js";
import { css, html, LitElement } from "lit";
import { customElement, property, state } from "lit/decorators";
import memoizeOne from "memoize-one";
import "../../../components/ha-svg-icon";
import { EnergyPreferences } from "../../../data/energy";
import { fetchStatistics, Statistics } from "../../../data/history";
import { HomeAssistant } from "../../../types";
import { LovelaceCard } from "../types";
import { EnergySummaryCardConfig } from "./types";

@customElement("hui-energy-summary-card")
class HuiEnergySummaryCard extends LitElement implements LovelaceCard {
  @property({ attribute: false }) public hass?: HomeAssistant;

  @state() private _config?: EnergySummaryCardConfig;

  @state() private _data?: Statistics;

  private _fetching = false;

  public setConfig(config: EnergySummaryCardConfig): void {
    this._config = config;
  }

  public getCardSize(): Promise<number> | number {
    return 3;
  }

  public willUpdate(changedProps) {
    super.willUpdate(changedProps);

    if (!this._fetching && !this._data) {
      this._getStatistics();
    }
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
            <div class="data">${!this._data ? "" : "23%"}</div>
          </div>

          <div class="row">
            <ha-svg-icon .path=${mdiCashMultiple}></ha-svg-icon>
            <div class="label">Total consumption of today</div>
            <div class="data">
              ${!this._data
                ? ""
                : this._computeTotalConsumption(this._config.prefs, this._data)}
            </div>
          </div>

          <div class="row">
            <ha-svg-icon .path=${mdiCashMultiple}></ha-svg-icon>
            <div class="label">Total production of today</div>
            <div class="data">${!this._data ? "" : "23%"}</div>
          </div>

          <div class="row">
            <ha-svg-icon .path=${mdiCashMultiple}></ha-svg-icon>
            <div class="label">Total costs of today</div>
            <div class="data">${!this._data ? "" : "23%"}</div>
          </div>

          <div class="row">
            <ha-svg-icon .path=${mdiCashMultiple}></ha-svg-icon>
            <div class="label">Total cost saved by solar panels</div>
            <div class="data">${!this._data ? "" : "23%"}</div>
          </div>

          <div class="row">
            <ha-svg-icon .path=${mdiCashMultiple}></ha-svg-icon>
            <div class="label">
              If you have tariffs it should show the current tariff and what
              time will it change
            </div>
            <div class="data">${!this._data ? "" : "23%"}</div>
          </div>
        </div>
      </ha-card>
    `;
  }

  // This is superduper temp.
  private async _getStatistics(): Promise<void> {
    if (this._fetching) {
      return;
    }
    const startDate = new Date();
    // This should be _just_ today (since local midnight)
    // For now we do a lot because fake data is not current.
    startDate.setHours(-24 * 30);
    this._fetching = true;
    try {
      this._data = await fetchStatistics(this.hass!, startDate, undefined, [
        this._config!.prefs.home_consumption[0].stat_consumption,
      ]);
    } finally {
      this._fetching = false;
    }
  }

  private _computeTotalConsumption = memoizeOne(
    (prefs: EnergyPreferences, data: Statistics) => {
      const stat = prefs.home_consumption[0].stat_consumption;
      if (!(stat in data)) {
        return 0;
      }
      const endSum = data[stat][data[stat].length - 1].sum;
      if (endSum === null) {
        return 0;
      }
      const startSum = data[stat][0].sum;
      if (startSum === null) {
        return endSum;
      }
      return `${(endSum - startSum).toFixed(2)} kWh`;
    }
  );

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
