import type { CSSResultGroup } from "lit";
import { css, html, LitElement, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import { classMap } from "lit/directives/class-map";
import memoizeOne from "memoize-one";
import "../../../../components/ha-card";
import "../../../../components/ha-alert";
import "../../../../components/ha-icon";
import "../../../../components/ha-icon-button-arrow-prev";
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

interface Breakdown {
  id: string;
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

  @state() private _navigationStack: {
    type: "area" | "entity";
    id?: string;
    name?: string;
  }[] = [];

  @state() private _currentView: "areas" | "entities" = "areas";

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
      ): Breakdown[] => {
        const breakdowns = Object.values(hass.areas)
          .map((area): Breakdown | null => {
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
              id: area.area_id,
              name: areaName,
              value: sum,
            };
          })
          .filter((bd): bd is Breakdown => bd !== null);

        return [
          ...breakdowns,
          {
            id: "untracked",
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

    const _computeEntityBreakdown = memoizeOne(
      (
        hass: HomeAssistant,
        powerEntityId: string,
        areaId: string
      ): Breakdown[] => {
        const powerEntityIds = Object.keys(hass.states).filter(
          generateEntityFilter(hass, {
            domain: "sensor",
            device_class: "power",
            area: areaId,
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

        return validPowerEntities
          .map((entity) => ({
            id: entity.entity_id,
            name:
              hass.states[entity.entity_id]?.attributes.friendly_name ||
              entity.entity_id.split(".")[1].replace(/_/g, " "),
            value: Number(entity.state),
          }))
          .sort((a, b) => b.value - a.value);
      }
    );

    const currentNavigation =
      this._navigationStack[this._navigationStack.length - 1];
    const showBackButton =
      this._currentView === "entities" && currentNavigation;

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
              ${showBackButton
                ? html`
                    <div class="navigation-header">
                      <ha-icon-button-arrow-prev
                        @click=${this._goBack}
                        .hass=${this.hass}
                      ></ha-icon-button-arrow-prev>
                      <span class="navigation-title"
                        >${currentNavigation?.name}</span
                      >
                    </div>
                  `
                : nothing}
              <ha-md-list>
                ${this._currentView === "areas"
                  ? breakdown.map(
                      (area, idx) => html`
                        ${breakdown.length > 1 && idx === breakdown.length - 1
                          ? html`<ha-md-divider
                              role="separator"
                              tabindex="-1"
                            ></ha-md-divider>`
                          : nothing}
                        <ha-md-list-item
                          class=${classMap({
                            "untracked-item": area.id === "untracked",
                          })}
                          type="button"
                          @click=${area.id !== "untracked"
                            ? this._createAreaClickHandler(area)
                            : undefined}
                        >
                          <span slot="headline">${area.name}</span>
                          <span class="meta" slot="end"
                            >${formatNumber(area.value, this.hass.locale, {
                              maximumFractionDigits: 1,
                            })}
                            ${uom ?? ""}</span
                          >
                        </ha-md-list-item>
                      `
                    )
                  : currentNavigation?.id
                    ? _computeEntityBreakdown(
                        this.hass,
                        entityId,
                        currentNavigation.id
                      ).map(
                        (entity) => html`
                          <ha-md-list-item
                            type="button"
                            @click=${this._createEntityClickHandler(entity)}
                          >
                            <span slot="headline">${entity.name}</span>
                            <span class="meta" slot="end"
                              >${formatNumber(entity.value, this.hass.locale, {
                                maximumFractionDigits: 1,
                              })}
                              ${uom ?? ""}</span
                            >
                          </ha-md-list-item>
                        `
                      )
                    : nothing}
              </ha-md-list>
            </div>
          `
        : nothing}
    </ha-card>`;
  }

  private _handleHeadingClick(): void {
    fireEvent(this, "hass-more-info", { entityId: this._config!.power_entity });
  }

  private _handleAreaClick(area: Breakdown): void {
    if (area.id === "untracked") return;

    this._navigationStack.push({
      type: "area",
      id: area.id,
      name: area.name,
    });
    this._currentView = "entities";
  }

  private _handleEntityClick(entity: Breakdown): void {
    fireEvent(this, "hass-more-info", { entityId: entity.id });
  }

  private _createAreaClickHandler(area: Breakdown) {
    return () => this._handleAreaClick(area);
  }

  private _createEntityClickHandler(entity: Breakdown) {
    return () => this._handleEntityClick(entity);
  }

  private _goBack(): void {
    if (this._navigationStack.length > 0) {
      this._navigationStack.pop();
      this._currentView = "areas";
    }
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
          padding: 0;
        }

        .breakdown ha-md-list-item.untracked-item {
          pointer-events: none;
        }

        .navigation-header {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 0 8px 2px;
          border-bottom: 1px solid var(--divider-color);
          background-color: var(--card-background-color);
          position: sticky;
          top: 0;
          z-index: 1;
        }

        .navigation-header ha-icon-button-arrow-prev {
          --mdc-icon-button-size: 32px;
          --mdc-icon-size: 20px;
        }

        .navigation-title {
          font-size: var(--ha-font-size-body-1);
          font-weight: var(--ha-font-weight-medium);
          color: var(--primary-text-color);
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          flex: 1;
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
