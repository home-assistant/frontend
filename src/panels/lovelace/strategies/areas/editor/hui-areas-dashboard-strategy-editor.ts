import { css, html, LitElement, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import { fireEvent } from "../../../../../common/dom/fire_event";
import "../../../../../components/ha-areas-display-editor";
import type { AreasDisplayValue } from "../../../../../components/ha-areas-display-editor";
import "../../../../../components/ha-entities-display-editor";
import "../../../../../components/ha-icon-button";
import "../../../../../components/ha-icon-button-prev";
import "../../../../../components/ha-svg-icon";
import type { HomeAssistant } from "../../../../../types";
import {
  AREA_STRATEGY_GROUP_ICONS,
  AREA_STRATEGY_GROUPS,
  AREA_STRATEGY_GROUP_LABELS,
  getAreaGroupedEntities,
} from "../../area/helpers/area-strategy-helper";
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

    const value = this._config.areas_display;

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
          return html`
            <ha-expansion-panel
              header=${AREA_STRATEGY_GROUP_LABELS[group]}
              expanded
              outlined
            >
              <ha-svg-icon
                slot="leading-icon"
                .path=${AREA_STRATEGY_GROUP_ICONS[group]}
              ></ha-svg-icon>
              ${entities.length
                ? html`
                    <ha-entities-display-editor
                      .hass=${this.hass}
                      .value=${value}
                      .label=${group}
                      @value-changed=${this._areaDisplayChanged}
                      .entitiesIds=${entities}
                    ></ha-entities-display-editor>
                  `
                : html`
                    <p>
                      No entities in this section, it will not be displayed.
                    </p>
                  `}
            </ha-expansion-panel>
          `;
        })}
      `;
    }

    return html`
      <ha-areas-display-editor
        .hass=${this.hass}
        .value=${value}
        .label=${this.hass.localize(
          "ui.panel.lovelace.editor.strategy.areas.areas_display"
        )}
        @value-changed=${this._areaDisplayChanged}
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

  private _areaDisplayChanged(ev: CustomEvent): void {
    const value = ev.detail.value as AreasDisplayValue;
    const newConfig: AreasDashboardStrategyConfig = {
      ...this._config!,
      areas_display: value,
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
