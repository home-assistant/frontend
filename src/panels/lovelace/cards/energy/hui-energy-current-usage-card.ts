import type { CSSResultGroup } from "lit";
import { css, html, LitElement, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import { classMap } from "lit/directives/class-map";
import memoizeOne from "memoize-one";
import "../../../../components/ha-card";
import "../../../../components/ha-alert";
import "../../../../components/ha-icon";
import "../../../../components/ha-md-list";
import "../../../../components/ha-md-list-item";
import "../../../../components/ha-md-divider";
import type { HomeAssistant } from "../../../../types";
import type {
  LovelaceCard,
  LovelaceCardEditor,
  LovelaceGridOptions,
} from "../../types";
import type { EnergyCurrentUsageCardConfig } from "../types";
import { fireEvent } from "../../../../common/dom/fire_event";
import { computeAreaName } from "../../../../common/entity/compute_area_name";
import { generateEntityFilter } from "../../../../common/entity/entity_filter";
import {
  formatNumber,
  isNumericState,
} from "../../../../common/number/format_number";
import { haStyleScrollbar } from "../../../../resources/styles";
import { createEntityNotFoundWarning } from "../../components/hui-warning";

interface AreaBreakdown {
  name: string;
  value: number;
}

@customElement("hui-energy-current-usage-card")
export class HuiEnergyCurrentUsageCard
  extends LitElement
  implements LovelaceCard
{
  @property({ attribute: false }) public hass!: HomeAssistant;

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
      min_columns: 5,
      min_rows: 1,
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
      (
        hass: HomeAssistant,
        powerEntityId: string,
        powerEntityState: string
      ): AreaBreakdown[] => {
        const breakdowns = Object.values(hass.areas)
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
              value: sum,
            };
          })
          .filter((bd): bd is AreaBreakdown => bd !== null);

        return [
          ...breakdowns,
          {
            name: hass.localize("ui.common.untracked"),
            value:
              Number(powerEntityState) -
              breakdowns.reduce((acc, bd) => acc + bd.value, 0),
          },
        ];
      }
    );

    const breakdown = _computeBreakdown(this.hass, entityId, stateObj.state);
    const gridRows = Number(this._config.grid_options?.rows ?? 3);

    return html`<ha-card>
      <div
        class=${classMap({
          heading: true,
          "reduced-padding": gridRows < 3,
          "single-row": gridRows === 1,
        })}
        @click=${this._handleHeadingClick}
      >
        <ha-icon class="icon" .icon=${powerEntityIcon}></ha-icon>
        <span class="value"
          >${formatNumber(stateObj.state, this.hass.locale, {
            maximumFractionDigits: 1,
          })}</span
        >
        <span class="measurement">${uom}</span>
      </div>
      ${gridRows > 1
        ? html`
            <div class="breakdown ha-scrollbar">
              <ha-md-list>
                ${breakdown.map(
                  (area, idx) => html`
                    ${breakdown.length > 1 && idx === breakdown.length - 1
                      ? html`<ha-md-divider
                          role="separator"
                          tabindex="-1"
                        ></ha-md-divider>`
                      : nothing}
                    <ha-md-list-item>
                      <span slot="headline">${area.name}</span>
                      <span class="meta" slot="end"
                        >${formatNumber(area.value, this.hass.locale, {
                          maximumFractionDigits: 1,
                        })}
                        ${uom ?? ""}</span
                      >
                    </ha-md-list-item>
                  `
                )}
              </ha-md-list>
            </div>
          `
        : nothing}
    </ha-card>`;
  }

  private _handleHeadingClick(): void {
    fireEvent(this, "hass-more-info", { entityId: this._config!.power_entity });
  }

  static get styles(): CSSResultGroup {
    return [
      haStyleScrollbar,
      css`
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
          line-height: var(--ha-line-height-normal);
        }
        .heading.reduced-padding {
          padding: 8px 8px 0;
        }
        .heading.reduced-padding {
          line-height: var(--ha-line-height-condensed);
        }

        .heading .icon {
          --mdc-icon-size: var(--ha-font-size-3xl);
        }
        .heading.single-row .icon {
          --mdc-icon-size: var(--ha-font-size-2xl);
        }

        .heading .value {
          font-size: var(--ha-font-size-5xl);
          font-weight: var(--ha-font-weight-light);
        }
        .heading.single-row .value {
          font-size: var(--ha-font-size-4xl);
        }

        .heading .measurement {
          padding-bottom: 10px;
          align-self: flex-end;
          font-size: var(--ha-font-size-xl);
          color: var(--secondary-text-color);
        }
        .heading.single-row .measurement {
          padding-bottom: 8px;
          font-size: var(--ha-font-size-l);
        }

        .breakdown {
          flex: 1 1 auto;
          min-height: 0;
          overflow: auto;
          width: 100%;
        }

        .breakdown ha-md-list {
          --md-list-item-label-text-line-height: var(
            --ha-line-height-condensed
          );
          --md-list-item-one-line-container-height: 16px;
          --md-list-item-top-space: 8px;
          --md-list-item-bottom-space: 8px;
        }

        .meta {
          color: var(--secondary-text-color);
        }
      `,
    ];
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "hui-energy-current-usage-card": HuiEnergyCurrentUsageCard;
  }
}
