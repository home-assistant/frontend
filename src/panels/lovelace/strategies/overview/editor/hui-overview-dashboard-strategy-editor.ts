import { html, LitElement, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import { fireEvent } from "../../../../../common/dom/fire_event";
import "../../../../../components/entity/ha-entities-picker";
import type { HomeAssistant } from "../../../../../types";
import type { LovelaceStrategyEditor } from "../../types";
import type { OverviewDashboardStrategyConfig } from "../overview-dashboard-strategy";

@customElement("hui-overview-dashboard-strategy-editor")
export class HuiOverviewDashboardStrategyEditor
  extends LitElement
  implements LovelaceStrategyEditor
{
  @property({ attribute: false }) public hass?: HomeAssistant;

  @state()
  private _config?: OverviewDashboardStrategyConfig;

  public setConfig(config: OverviewDashboardStrategyConfig): void {
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
        .label=${"Favorites entities"}
        .placeholder=${"Add favorite entity"}
        reorder
        allow-custom-entity
        @value-changed=${this._valueChanged}
      >
      </ha-entities-picker>
    `;
  }

  private _valueChanged(ev: CustomEvent): void {
    ev.stopPropagation();
    if (!this._config || !this.hass) {
      return;
    }

    const favoriteEntities = ev.detail.value as string[];

    const config: OverviewDashboardStrategyConfig = {
      ...this._config,
      favorite_entities: favoriteEntities,
    };

    if (config.favorite_entities?.length === 0) {
      delete config.favorite_entities;
    }

    fireEvent(this, "config-changed", { config });
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "hui-overview-dashboard-strategy-editor": HuiOverviewDashboardStrategyEditor;
  }
}
