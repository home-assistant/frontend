import { css, html, LitElement, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import { fireEvent } from "../../../../../common/dom/fire_event";
import "../../../../../components/ha-areas-display-editor";
import type { AreasDisplayValue } from "../../../../../components/ha-areas-display-editor";
import "../../../../../components/ha-entities-display-editor";
import "../../../../../components/ha-icon-button";
import "../../../../../components/ha-icon-button-prev";
import "../../../../../components/ha-icon";
import type { HomeAssistant } from "../../../../../types";
import type { AreaStrategyGroup } from "../helpers/areas-strategy-helper";
import {
  AREA_STRATEGY_GROUP_ICONS,
  AREA_STRATEGY_GROUPS,
  getAreaGroupedEntities,
} from "../helpers/areas-strategy-helper";
import type { LovelaceStrategyEditor } from "../../types";
import type { AreasDashboardStrategyConfig } from "../areas-dashboard-strategy";

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

    if (this._area) {
      const groups = getAreaGroupedEntities(this._area, this.hass);

      const area = this.hass.areas[this._area];

      return html`
        <div class="toolbar">
          <ha-icon-button-prev @click=${this._back}></ha-icon-button-prev>
          <p>${area.name}</p>
        </div>
        ${AREA_STRATEGY_GROUPS.map((group) => {
          const entities = groups[group] || [];
          const value =
            this._config!.areas_options?.[this._area!]?.groups_options?.[group];

          return html`
            <ha-expansion-panel
              header=${this.hass!.localize(
                `ui.panel.lovelace.strategy.areas.groups.${group}`
              )}
              expanded
              outlined
            >
              <ha-icon
                slot="leading-icon"
                .icon=${AREA_STRATEGY_GROUP_ICONS[group]}
              ></ha-icon>
              ${entities.length
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
      `;
    }

    const value = this._config.areas_display;

    return html`
      <ha-areas-display-editor
        .hass=${this.hass}
        .value=${value}
        .label=${this.hass.localize(
          "ui.panel.lovelace.editor.strategy.areas.areas_display"
        )}
        @value-changed=${this._areasDisplayChanged}
        expanded
        show-navigation-button
        @item-display-navigate-clicked=${this._handleAreaNavigate}
      ></ha-areas-display-editor>
    `;
  }

  private _back(): void {
    if (this._area) {
      this._area = undefined;
    }
  }

  private _handleAreaNavigate(ev: CustomEvent): void {
    this._area = ev.detail.value;
  }

  private _areasDisplayChanged(ev: CustomEvent): void {
    const value = ev.detail.value as AreasDisplayValue;
    const newConfig: AreasDashboardStrategyConfig = {
      ...this._config!,
      areas_display: value,
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
      css`
        .toolbar {
          display: flex;
          align-items: center;
        }
        ha-expansion-panel {
          margin-bottom: 8px;
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
