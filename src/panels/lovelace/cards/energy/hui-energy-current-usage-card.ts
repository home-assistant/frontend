import { css, html, LitElement, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import memoizeOne from "memoize-one";
import "../../../../components/ha-card";
import "../../../../components/ha-alert";
import "../../../../components/ha-icon";
import "../../../../components/ha-md-list";
import "../../../../components/ha-md-list-item";
import type { HomeAssistant } from "../../../../types";
import type {
  LovelaceCard,
  LovelaceCardEditor,
  LovelaceGridOptions,
} from "../../types";
import type { EnergyCurrentUsageCardConfig } from "../types";
import { createEntityNotFoundWarning } from "../../components/hui-warning";
import { fireEvent } from "../../../../common/dom/fire_event";
import { computeAreaName } from "../../../../common/entity/compute_area_name";
import { generateEntityFilter } from "../../../../common/entity/entity_filter";
import {
  formatNumber,
  isNumericState,
} from "../../../../common/number/format_number";
import { blankBeforeUnit } from "../../../../common/translations/blank_before_unit";

interface AreaBreakdown {
  name: string;
  value: string;
}

@customElement("hui-energy-current-usage-card")
export class HuiEnergyCurrentUsageCard
  extends LitElement
  implements LovelaceCard
{
  @property({ attribute: false }) public hass!: HomeAssistant;

  // @property({ attribute: false }) public layout?: string;

  @state() private _config?: EnergyCurrentUsageCardConfig;

  public static async getConfigElement(): Promise<LovelaceCardEditor> {
    await import(
      "../../editor/config-elements/hui-energy-current-usage-card-editor"
    );
    return document.createElement("hui-energy-current-usage-card-editor");
  }

  public setConfig(config: EnergyCurrentUsageCardConfig): void {
    this._config = {
      ...config,
    };
  }

  public static async getStubConfig(
    _hass: HomeAssistant
  ): Promise<EnergyCurrentUsageCardConfig> {
    return { type: "energy-current-usage", power_entity: "" };
  }

  public getCardSize(): number {
    return 2;
  }

  public getGridOptions(): LovelaceGridOptions {
    return {
      columns: 6,
      rows: 3,
      min_columns: 6,
      min_rows: 3,
    };
  }

  protected render() {
    if (!this._config || !this.hass) {
      return nothing;
    }

    const entityId = this._config.power_entity;
    const stateObj = this.hass.states[entityId];

    if (!stateObj) {
      return html`
        <hui-warning .hass=${this.hass}>
          ${createEntityNotFoundWarning(this.hass, entityId)}
        </hui-warning>
      `;
    }

    const powerEntityCompatible = stateObj.attributes.device_class === "power";
    if (!powerEntityCompatible) {
      return html`<ha-alert alert-type="error">
        ${this.hass.localize(
          "ui.panel.lovelace.editor.card.energy-current-usage.power_entity_invalid"
        )}
      </ha-alert>`;
    }

    const uom = stateObj.attributes.unit_of_measurement;
    const powerEntityIcon = this._config.power_icon?.length
      ? this._config.power_icon
      : "mdi:lightning-bolt";

    const _computeBreakdown = memoizeOne(
      (hass: HomeAssistant, powerEntityId: string): AreaBreakdown[] =>
        Object.values(hass.areas)
          .map((area): AreaBreakdown | null => {
            const areaName = computeAreaName(area);
            if (!areaName) {
              return null;
            }

            const powerEntityIds = Object.keys(hass.states).filter(
              generateEntityFilter(hass, {
                domain: "sensor",
                device_class: "power",
                area: area.area_id,
              })
            );

            const validPowerEntities = powerEntityIds
              .map((id) => hass.states[id])
              .filter(
                (st) =>
                  st &&
                  st.entity_id !== powerEntityId &&
                  isNumericState(st) &&
                  !isNaN(Number(st.state))
              );
            if (validPowerEntities.length === 0) {
              return null;
            }

            const sum = validPowerEntities.reduce(
              (acc, entity) => acc + Number(entity.state),
              0
            );
            if (isNaN(sum) || sum === 0) {
              return null;
            }

            return {
              name: areaName,
              value: formatNumber(sum, hass.locale, {
                maximumFractionDigits: 1,
              }),
            };
          })
          .filter((bd): bd is AreaBreakdown => bd !== null)
    );

    const breakdown = _computeBreakdown(this.hass, entityId);

    return html`<ha-card>
      <div class="heading" @click=${this._handleHeadingClick}>
        <ha-icon class="icon" .icon=${powerEntityIcon}></ha-icon>
        <span class="value">${stateObj.state}</span>
        <span class="measurement">${uom}</span>
      </div>
      <div class="breakdown">
        <ha-md-list>
          ${breakdown.map(
            (area) =>
              html`<ha-md-list-item>
                <span slot="headline">${area.name}</span>
                <span slot="end" class="meta"
                  >${area.value}${uom
                    ? blankBeforeUnit(uom, this.hass.locale)
                    : ""}${uom ?? ""}</span
                >
              </ha-md-list-item>`
          )}
        </ha-md-list>
      </div>
    </ha-card>`;
  }

  private _handleHeadingClick(): void {
    fireEvent(this, "hass-more-info", { entityId: this._config!.power_entity });
  }

  static styles = css`
    ha-card {
      height: 100%;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: flex-start;
      gap: 8px;
    }

    .heading {
      width: fit-content;
      position: relative;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 12px 12px 0;
      gap: 2px;
      pointer-events: all;
      cursor: pointer;
    }

    .heading .icon {
      --mdc-icon-size: var(--ha-font-size-3xl);
    }

    .heading .value {
      font-size: var(--ha-font-size-5xl);
      font-weight: var(--ha-font-weight-light);
    }

    .heading .measurement {
      padding-bottom: 10px;
      align-self: flex-end;
      font-size: var(--ha-font-size-xl);
      color: var(--secondary-text-color);
    }

    .breakdown {
      flex: 1 1 auto;
      min-height: 0;
      overflow: auto;
      width: 100%;
    }

    .breakdown ha-md-list {
      --md-list-item-label-text-line-height: var(--ha-line-height-condensed);
      --md-list-item-one-line-container-height: 16px;
      --md-list-item-top-space: 8px;
      --md-list-item-bottom-space: 8px;
    }

    .meta {
      color: var(--secondary-text-color);
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    "hui-energy-current-usage-card": HuiEnergyCurrentUsageCard;
  }
}
