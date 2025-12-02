import { mdiThermometerWater } from "@mdi/js";
import { css, html, LitElement, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import { cache } from "lit/directives/cache";
import { keyed } from "lit/directives/keyed";
import memoizeOne from "memoize-one";
import { fireEvent } from "../../../../../common/dom/fire_event";
import "../../../../../components/ha-areas-display-editor";
import type { AreasDisplayValue } from "../../../../../components/ha-areas-display-editor";
import "../../../../../components/ha-areas-floors-display-editor";
import type { AreasFloorsDisplayValue } from "../../../../../components/ha-areas-floors-display-editor";
import "../../../../../components/ha-entities-display-editor";
import "../../../../../components/ha-icon";
import "../../../../../components/ha-icon-button";
import "../../../../../components/ha-icon-button-prev";
import "../../../../../components/ha-svg-icon";
import {
  updateAreaRegistryEntry,
  type AreaRegistryEntry,
} from "../../../../../data/area_registry";
import {
  haCardSizeLarge,
  haCardSizeSmall,
} from "../../../../../resources/ha-icons";
import { buttonLinkStyle } from "../../../../../resources/styles";
import type { HomeAssistant } from "../../../../../types";
import { showAreaRegistryDetailDialog } from "../../../../config/areas/show-dialog-area-registry-detail";
import type { LovelaceStrategyEditor } from "../../types";
import type { AreasDashboardStrategyConfig } from "../areas-dashboard-strategy";
import type { AreaStrategyGroup } from "../helpers/areas-strategy-helper";
import {
  AREA_STRATEGY_GROUP_ICONS,
  AREA_STRATEGY_GROUPS,
  getAreaGroupedEntities,
} from "../helpers/areas-strategy-helper";
import type { DisplayItem } from "../../../../../components/ha-items-display-editor";

@customElement("hui-areas-dashboard-strategy-editor")
export class HuiAreasDashboardStrategyEditor
  extends LitElement
  implements LovelaceStrategyEditor
{
  @property({ attribute: false }) public hass?: HomeAssistant;

  @state()
  private _config?: AreasDashboardStrategyConfig;

  public setConfig(config: AreasDashboardStrategyConfig): void {
    this._config = config;
  }

  @state()
  private _area?: string;

  protected render() {
    if (!this.hass || !this._config) {
      return nothing;
    }

    return cache(
      this._area ? this._renderOverviewEditor() : this._renderAreaEditor()
    );
  }

  private _renderOverviewEditor() {
    if (!this.hass || !this._config || !this._area) {
      return nothing;
    }

    const groups = getAreaGroupedEntities(this._area, this.hass);

    const area = this.hass.areas[this._area];

    return keyed(
      area.area_id,
      html`
        <div class="toolbar">
          <ha-icon-button-prev @click=${this._back}></ha-icon-button-prev>
          <p>${area.name}</p>
        </div>
        <ha-expansion-panel
          .header=${this.hass!.localize(
            `ui.panel.lovelace.strategy.areas.sensors`
          )}
          left-chevron
          expanded
          outlined
        >
          <ha-svg-icon
            slot="leading-icon"
            .path=${mdiThermometerWater}
          ></ha-svg-icon>
          <p>
            ${this.hass!.localize(
              `ui.panel.lovelace.strategy.areas.sensors_description`,
              {
                edit_the_area: html`
                  <button class="link" @click=${this._editArea} .area=${area}>
                    ${this.hass!.localize(
                      "ui.panel.lovelace.strategy.areas.edit_the_area"
                    )}
                  </button>
                `,
              }
            )}
          </p>
        </ha-expansion-panel>
        ${AREA_STRATEGY_GROUPS.map((group) => {
          const entities = groups[group] || [];
          const value =
            this._config!.areas_options?.[this._area!]?.groups_options?.[group];

          return html`
            <ha-expansion-panel
              .header=${this.hass!.localize(
                `ui.panel.lovelace.strategy.areas.groups.${group}`
              )}
              left-chevron
              expanded
              outlined
            >
              <ha-icon
                slot="leading-icon"
                .icon=${AREA_STRATEGY_GROUP_ICONS[group]}
              ></ha-icon>
              ${entities.length > 0
                ? html`
                    <ha-entities-display-editor
                      .hass=${this.hass}
                      .value=${value}
                      .label=${group}
                      @value-changed=${this._entitiesDisplayChanged}
                      .group=${group}
                      .area=${this._area}
                      .entitiesIds=${entities}
                    ></ha-entities-display-editor>
                  `
                : html`
                    <p>
                      ${this.hass!.localize(
                        "ui.panel.lovelace.editor.strategy.areas.no_entities"
                      )}
                    </p>
                  `}
            </ha-expansion-panel>
          `;
        })}
      `
    );
  }

  private _renderAreaEditor() {
    if (!this.hass || !this._config) {
      return nothing;
    }

    const value = this._areasFloorsDisplayValue(this._config);

    return html`
      <ha-areas-floors-display-editor
        .hass=${this.hass}
        .value=${value}
        .label=${this.hass.localize(
          "ui.panel.lovelace.editor.strategy.areas.areas_display"
        )}
        @value-changed=${this._areasFloorsDisplayChanged}
        expanded
        show-navigation-button
        .actionsRenderer=${this._areasActionsButtonsRenderer}
        @item-display-navigate-clicked=${this._handleAreaNavigate}
      ></ha-areas-floors-display-editor>
    `;
  }

  private _areasActionsButtonsRenderer = (item: DisplayItem) => {
    const areaId = item.value;
    const isHidden =
      this._config?.areas_display?.hidden?.includes(areaId) || false;
    const isLarge =
      !isHidden && this._config?.areas_options?.[areaId]?.card_size === "large";

    return html`
      <ha-icon-button
        .label=${this.hass!.localize(
          `ui.panel.lovelace.editor.strategy.areas.${isLarge ? "use_compact_card" : "use_large_card"}`
        )}
        @click=${this._toggleAreaLargeCard}
        .area=${areaId}
        .path=${isLarge ? haCardSizeLarge : haCardSizeSmall}
        .disabled=${isHidden}
      >
      </ha-icon-button>
    `;
  };

  private _toggleAreaLargeCard = (ev: Event) => {
    ev.stopPropagation();
    const area = (ev.currentTarget! as any).area as string;
    const newConfig: AreasDashboardStrategyConfig = {
      ...this._config!,
      areas_options: {
        ...this._config!.areas_options,
        [area]: {
          ...this._config!.areas_options?.[area],
          card_size:
            this._config!.areas_options?.[area]?.card_size === "large"
              ? "small"
              : "large",
        },
      },
    };

    if (newConfig.areas_options![area]!.card_size === "small") {
      delete newConfig.areas_options![area].card_size;
    }

    if (Object.keys(newConfig.areas_options![area]).length === 0) {
      delete newConfig.areas_options![area];
    }

    if (Object.keys(newConfig.areas_options!).length === 0) {
      delete newConfig.areas_options;
    }

    fireEvent(this, "config-changed", { config: newConfig });
  };

  private _back(): void {
    if (this._area) {
      this._area = undefined;
    }
  }

  private _areasFloorsDisplayValue = memoizeOne(
    (config: AreasDashboardStrategyConfig): AreasFloorsDisplayValue => ({
      areas_display: config.areas_display,
      floors_display: config.floors_display,
    })
  );

  private _editArea(ev: Event): void {
    ev.stopPropagation();
    const area = (ev.currentTarget! as any).area as AreaRegistryEntry;
    showAreaRegistryDetailDialog(this, {
      entry: area,
      updateEntry: (values) =>
        updateAreaRegistryEntry(this.hass!, area.area_id, values),
    });
  }

  private _handleAreaNavigate(ev: CustomEvent): void {
    this._area = ev.detail.value;
  }

  private _areasFloorsDisplayChanged(ev: CustomEvent): void {
    const value = ev.detail.value as AreasFloorsDisplayValue;
    const newConfig: AreasDashboardStrategyConfig = {
      ...this._config!,
      ...value,
    };

    fireEvent(this, "config-changed", { config: newConfig });
  }

  private _entitiesDisplayChanged(ev: CustomEvent): void {
    const value = ev.detail.value as AreasDisplayValue;

    const { group, area } = ev.currentTarget as unknown as {
      group: AreaStrategyGroup;
      area: string;
    };

    const newConfig: AreasDashboardStrategyConfig = {
      ...this._config!,
      areas_options: {
        ...this._config!.areas_options,
        [area]: {
          ...this._config!.areas_options?.[area],
          groups_options: {
            ...this._config!.areas_options?.[area]?.groups_options,
            [group]: value,
          },
        },
      },
    };

    fireEvent(this, "config-changed", { config: newConfig });
  }

  static get styles() {
    return [
      buttonLinkStyle,
      css`
        .toolbar {
          display: flex;
          align-items: center;
          margin: 0 -20px 8px -20px;
          --mdc-icon-button-size: 36px;
          padding: 0 16px;
        }
        .toolbar p {
          margin: 0;
          font-size: var(--ha-font-size-l);
          line-height: var(--ha-line-height-normal);
          font-weight: var(--ha-font-weight-normal);
          padding: 6px 4px;
        }
        ha-expansion-panel {
          margin-bottom: 8px;
          --expansion-panel-summary-padding: 0 16px;
        }
        ha-expansion-panel [slot="leading-icon"] {
          margin-inline-end: 16px;
        }
        ha-expansion-panel p {
          margin: 8px 8px 16px 8px;
        }
        button.link {
          color: var(--primary-color);
          text-decoration: none;
        }
      `,
    ];
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "hui-areas-dashboard-strategy-editor": HuiAreasDashboardStrategyEditor;
  }
}
