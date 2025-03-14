import { html, LitElement, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import { fireEvent } from "../../../../../common/dom/fire_event";
import "../../../../../components/ha-areas-display-editor";
import type { AreasDisplayValue } from "../../../../../components/ha-areas-display-editor";
import type { HomeAssistant } from "../../../../../types";
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

  protected render() {
    if (!this.hass || !this._config) {
      return nothing;
    }

    const value = this._config.areas_display;

    return html`
      <ha-areas-display-editor
        .hass=${this.hass}
        .value=${value}
        .label=${this.hass.localize(
          "ui.panel.lovelace.editor.strategy.areas.areas_display"
        )}
        @value-changed=${this._areaDisplayChanged}
        expanded
      ></ha-areas-display-editor>
    `;
  }

  private _areaDisplayChanged(ev: CustomEvent): void {
    const value = ev.detail.value as AreasDisplayValue;
    const newConfig: AreasDashboardStrategyConfig = {
      ...this._config!,
      areas_display: value,
    };

    fireEvent(this, "config-changed", { config: newConfig });
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "hui-areas-dashboard-strategy-editor": HuiAreasDashboardStrategyEditor;
  }
}
