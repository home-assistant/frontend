import { mdiInformationOutline } from "@mdi/js";
import { css, html, LitElement, nothing } from "lit";
import { customElement, state } from "lit/decorators";
import { styleMap } from "lit/directives/style-map";
import { consume } from "../../../../common/decorators/consume";
import "../../../../components/ha-card";
import "../../../../components/ha-gauge";
import "../../../../components/ha-svg-icon";
import "../../../../components/ha-tooltip";
import { internationalizationContext } from "../../../../data/context";
import type { EnergyData } from "../../../../data/energy";
import {
  computeConsumptionData,
  getSummedData,
  validateEnergyCollectionKey,
} from "../../../../data/energy";
import { EnergyCollectionController } from "../../../../data/energy-collection-controller";
import type {
  HomeAssistant,
  HomeAssistantInternationalization,
} from "../../../../types";
import type { LovelaceCard } from "../../types";
import { severityMap } from "../hui-gauge-card";
import type { EnergySelfSufficiencyGaugeCardConfig } from "../types";

const FORMAT_OPTIONS = {
  maximumFractionDigits: 0,
};

@customElement("hui-energy-self-sufficiency-gauge-card")
class HuiEnergySelfSufficiencyGaugeCard
  extends LitElement
  implements LovelaceCard
{
  public static async getConfigElement() {
    await import("../../editor/config-elements/hui-energy-graph-card-editor");
    return document.createElement("hui-energy-graph-card-editor");
  }

  @state() private _config?: EnergySelfSufficiencyGaugeCardConfig;

  public static getStubConfig(
    _hass: HomeAssistant,
    _entities: string[],
    _entitiesFill: string[]
  ): EnergySelfSufficiencyGaugeCardConfig {
    return {
      type: "energy-self-sufficiency-gauge",
    };
  }

  @state() private _data?: EnergyData;

  @state()
  @consume({ context: internationalizationContext, subscribe: true })
  private _i18n!: HomeAssistantInternationalization;

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

  public setConfig(config: EnergySelfSufficiencyGaugeCardConfig): void {
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

    // The strategy only includes this card if we have a grid.
    const { summedData, compareSummedData: _ } = getSummedData(this._data);
    const { consumption, compareConsumption: __ } = computeConsumptionData(
      summedData,
      undefined
    );

    const totalFromGrid = summedData.total.from_grid ?? 0;

    const totalHomeConsumption = Math.max(0, consumption.total.used_total);

    let value: number | undefined;
    if (
      totalFromGrid !== null &&
      totalHomeConsumption !== null &&
      totalHomeConsumption > 0
    ) {
      value = (1 - Math.min(1, totalFromGrid / totalHomeConsumption)) * 100;
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
                  label="%"
                  .formatOptions=${FORMAT_OPTIONS}
                  .locale=${this._i18n.locale}
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
                    "ui.panel.lovelace.cards.energy.self_sufficiency_gauge.card_indicates_self_sufficiency_quota"
                  )}
                </ha-tooltip>
                <div class="name">
                  ${this._i18n.localize(
                    "ui.panel.lovelace.cards.energy.self_sufficiency_gauge.self_sufficiency_quota"
                  )}
                </div>
              `
            : this._i18n.localize(
                "ui.panel.lovelace.cards.energy.self_sufficiency_gauge.self_sufficiency_could_not_calc"
              )
        }
      </ha-card>
    `;
  }

  private _computeSeverity(numberValue: number): string {
    if (numberValue > 75) {
      return severityMap.green;
    }
    if (numberValue < 50) {
      return severityMap.yellow;
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
      direction: ltr;
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
    "hui-energy-self-sufficiency-gauge-card": HuiEnergySelfSufficiencyGaugeCard;
  }
}
