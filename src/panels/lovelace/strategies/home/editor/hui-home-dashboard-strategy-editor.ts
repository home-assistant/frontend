import { css, html, LitElement, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import { fireEvent } from "../../../../../common/dom/fire_event";
import "../../../../../components/entity/ha-entities-picker";
import "../../../../../components/ha-button";
import type { HomeAssistant } from "../../../../../types";
import type { LovelaceStrategyEditor } from "../../types";
import type { HomeDashboardStrategyConfig } from "../home-dashboard-strategy";
import { showHomeAreasOrderDialog } from "../../../../home/dialogs/show-dialog-home-areas-order";

@customElement("hui-home-dashboard-strategy-editor")
export class HuiHomeDashboardStrategyEditor
  extends LitElement
  implements LovelaceStrategyEditor
{
  @property({ attribute: false }) public hass?: HomeAssistant;

  @state()
  private _config?: HomeDashboardStrategyConfig;

  public setConfig(config: HomeDashboardStrategyConfig): void {
    this._config = config;
  }

  protected render() {
    if (!this.hass || !this._config) {
      return nothing;
    }

    return html`
      <ha-entities-picker
        .hass=${this.hass}
        .value=${this._config.favorite_entities || []}
        label=${this.hass.localize(
          "ui.panel.lovelace.editor.strategy.home.favorite_entities"
        )}
        placeholder=${this.hass.localize(
          "ui.panel.lovelace.editor.strategy.home.add_favorite_entity"
        )}
        reorder
        @value-changed=${this._valueChanged}
      >
      </ha-entities-picker>

      <div class="section-divider"></div>

      <div class="reorder-section">
        <div class="section-header">
          <h3>
            ${this.hass.localize("ui.panel.home.editor.reorder_areas.title")}
          </h3>
          <p class="section-description">
            ${this.hass.localize(
              "ui.panel.home.editor.reorder_areas.description"
            )}
          </p>
        </div>
        <ha-button @click=${this._showReorderDialog}>
          ${this.hass.localize("ui.panel.home.editor.reorder_areas.button")}
        </ha-button>
      </div>
    `;
  }

  private _valueChanged(ev: CustomEvent): void {
    ev.stopPropagation();
    if (!this._config || !this.hass) {
      return;
    }

    const favoriteEntities = ev.detail.value as string[];

    const config: HomeDashboardStrategyConfig = {
      ...this._config,
      favorite_entities: favoriteEntities,
    };

    if (config.favorite_entities?.length === 0) {
      delete config.favorite_entities;
    }

    fireEvent(this, "config-changed", { config });
  }

  private _showReorderDialog(): void {
    if (!this._config || !this.hass) {
      return;
    }

    showHomeAreasOrderDialog(this, {
      config: this._config,
      saveConfig: async (updatedConfig) => {
        if (!this._config) {
          return;
        }

        // Update local config with the new areas_order
        const config: HomeDashboardStrategyConfig = {
          ...this._config,
          areas_order: updatedConfig.areas_order,
        };

        // Fire config-changed event for the strategy
        fireEvent(this, "config-changed", { config });
      },
    });
  }

  static styles = css`
    :host {
      display: block;
    }

    ha-entities-picker {
      display: block;
      margin-bottom: var(--ha-space-4);
    }

    .section-divider {
      height: 1px;
      background-color: var(--divider-color);
      margin: var(--ha-space-6) 0;
    }

    .reorder-section {
      display: flex;
      flex-direction: column;
      gap: var(--ha-space-4);
    }

    .section-header h3 {
      margin: 0 0 var(--ha-space-2) 0;
      font-size: 16px;
      font-weight: 500;
      color: var(--primary-text-color);
    }

    .section-description {
      margin: 0;
      font-size: 14px;
      color: var(--secondary-text-color);
    }

    .reorder-section ha-button {
      align-self: flex-start;
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    "hui-home-dashboard-strategy-editor": HuiHomeDashboardStrategyEditor;
  }
}
