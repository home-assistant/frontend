import { mdiInformationOutline } from "@mdi/js";
import type { HassConfig, HassEntity } from "home-assistant-js-websocket";
import { css, html, LitElement, nothing } from "lit";
import { customElement, state } from "lit/decorators";
import { styleMap } from "lit/directives/style-map";
import { consume } from "../../../../common/decorators/consume";
import { consumeEntityState } from "../../../../common/decorators/consume-context-entry";
import { transform } from "../../../../common/decorators/transform";
import { round } from "../../../../common/number/round";
import "../../../../components/ha-card";
import "../../../../components/ha-gauge";
import "../../../../components/ha-svg-icon";
import "../../../../components/ha-tooltip";
import {
  configContext,
  internationalizationContext,
} from "../../../../data/context";
import type { EnergyData } from "../../../../data/energy";
import {
  getSummedData,
  validateEnergyCollectionKey,
} from "../../../../data/energy";
import { EnergyCollectionController } from "../../../../data/energy-collection-controller";
import type {
  HomeAssistant,
  HomeAssistantConfig,
  HomeAssistantInternationalization,
} from "../../../../types";
import { createEntityNotFoundWarning } from "../../components/hui-warning";
import type { LovelaceCard } from "../../types";
import { severityMap } from "../hui-gauge-card";
import type { EnergyCarbonGaugeCardConfig } from "../types";

const FORMAT_OPTIONS = {
  maximumFractionDigits: 0,
};

@customElement("hui-energy-carbon-consumed-gauge-card")
class HuiEnergyCarbonGaugeCard extends LitElement implements LovelaceCard {
  public static async getConfigElement() {
    await import("../../editor/config-elements/hui-energy-graph-card-editor");
    return document.createElement("hui-energy-graph-card-editor");
  }

  @state() private _config?: EnergyCarbonGaugeCardConfig;

  public static getStubConfig(
    _hass: HomeAssistant,
    _entities: string[],
    _entitiesFill: string[]
  ): EnergyCarbonGaugeCardConfig {
    return {
      type: "energy-carbon-consumed-gauge",
    };
  }

  @state() private _data?: EnergyData;

  @state()
  @consumeEntityState({ entityIdPath: ["_data", "co2SignalEntity"] })
  private _co2State?: HassEntity;

  @state()
  @consume({ context: internationalizationContext, subscribe: true })
  private _i18n!: HomeAssistantInternationalization;

  @state()
  @consume({ context: configContext, subscribe: true })
  @transform<HomeAssistantConfig, HassConfig>({
    transformer: ({ config }) => config,
  })
  private _hassConfig!: HassConfig;

  constructor() {
    super();
    new EnergyCollectionController(this, {
      config: () => this._config,
      onData: (data) => {
        this._data = data;
      },
    });
  }

  public getCardSize(): number {
    return 4;
  }

  public setConfig(config: EnergyCarbonGaugeCardConfig): void {
    if (config.collection_key) {
      validateEnergyCollectionKey(config.collection_key);
    }
    this._config = config;
  }

  protected render() {
    if (!this._config) {
      return nothing;
    }

    if (!this._data) {
      return html`${this._i18n.localize("ui.panel.lovelace.cards.energy.loading")}`;
    }

    if (!this._data.co2SignalEntity) {
      return nothing;
    }

    if (!this._co2State) {
      return html`<hui-warning>
        ${createEntityNotFoundWarning(
          { config: this._hassConfig, localize: this._i18n.localize },
          this._data.co2SignalEntity
        )}
      </hui-warning>`;
    }

    const { summedData, compareSummedData: _ } = getSummedData(this._data);

    const totalGridConsumption = summedData.total.from_grid ?? 0;

    let value: number | undefined;

    if (this._data.fossilEnergyConsumption) {
      const highCarbonEnergy = this._data.fossilEnergyConsumption
        ? Object.values(this._data.fossilEnergyConsumption).reduce(
            (sum, a) => sum + a,
            0
          )
        : 0;

      const totalSolarProduction = summedData.total.solar ?? 0;

      const totalGridReturned = summedData.total.to_grid ?? 0;

      const totalEnergyConsumed =
        totalGridConsumption +
        Math.max(0, totalSolarProduction - totalGridReturned);

      if (totalEnergyConsumed) {
        value = round((1 - highCarbonEnergy / totalEnergyConsumed) * 100);
      }
    }

    return html`
      <ha-card>
        ${
          value !== undefined
            ? html`
                <ha-gauge
                  min="0"
                  max="100"
                  .value=${value}
                  .formatOptions=${FORMAT_OPTIONS}
                  .locale=${this._i18n.locale}
                  label="%"
                  style=${styleMap({
                    "--gauge-color": this._computeSeverity(value),
                  })}
                ></ha-gauge>

                <ha-svg-icon
                  id="info"
                  .path=${mdiInformationOutline}
                ></ha-svg-icon>
                <ha-tooltip for="info" placement="left">
                  ${this._i18n.localize(
                    "ui.panel.lovelace.cards.energy.carbon_consumed_gauge.card_indicates_energy_used"
                  )}
                </ha-tooltip>
                <div class="name">
                  ${this._i18n.localize(
                    "ui.panel.lovelace.cards.energy.carbon_consumed_gauge.low_carbon_energy_consumed"
                  )}
                </div>
              `
            : html`${this._i18n.localize(
                "ui.panel.lovelace.cards.energy.carbon_consumed_gauge.low_carbon_energy_not_calculated"
              )}`
        }
      </ha-card>
    `;
  }

  private _computeSeverity(numberValue: number): string {
    if (numberValue < 10) {
      return severityMap.red;
    }
    if (numberValue < 30) {
      return severityMap.yellow;
    }
    if (numberValue > 75) {
      return severityMap.green;
    }
    return severityMap.normal;
  }

  static styles = css`
    ha-card {
      height: 100%;
      overflow: hidden;
      padding: 16px;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-direction: column;
      box-sizing: border-box;
    }

    ha-gauge {
      width: 100%;
      max-width: 250px;
    }

    .name {
      text-align: center;
      line-height: initial;
      color: var(--primary-text-color);
      width: 100%;
      font-size: var(--ha-font-size-m);
      margin-top: 8px;
    }

    ha-svg-icon {
      position: absolute;
      right: 4px;
      inset-inline-end: 4px;
      inset-inline-start: initial;
      top: 4px;
      color: var(--secondary-text-color);
    }

    ha-tooltip::part(base__popup) {
      margin-top: 4px;
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    "hui-energy-carbon-consumed-gauge-card": HuiEnergyCarbonGaugeCard;
  }
}
