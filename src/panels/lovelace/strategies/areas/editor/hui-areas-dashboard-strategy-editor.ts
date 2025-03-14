import { mdiTextureBox } from "@mdi/js";
import { css, html, LitElement, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import { fireEvent } from "../../../../../common/dom/fire_event";
import { getAreaContext } from "../../../../../common/entity/context/get_area_context";
import "../../../../../components/ha-expansion-panel";
import "../../../../../components/ha-items-display-editor";
import type {
  DisplayItem,
  DisplayValue,
} from "../../../../../components/ha-items-display-editor";
import type { HomeAssistant } from "../../../../../types";
import type { LovelaceStrategyEditor } from "../../types";
import type { AreasDashboardStrategyConfig } from "../areas-dashboard-strategy";
import { getAreas } from "../helpers/areas-strategy-helpers";

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

    const areas = getAreas(this.hass.areas, [], this._config.areas_order);

    const items: DisplayItem[] = areas.map((area) => {
      const { floor } = getAreaContext(area.area_id, this.hass!);
      return {
        value: area.area_id,
        label: area.name,
        icon: area.icon ?? undefined,
        iconPath: mdiTextureBox,
        description: floor?.name,
      };
    });

    const value: DisplayValue = {
      order: this._config.areas_order ?? [],
      hidden: this._config.hidden_areas ?? [],
    };

    return html`
      <ha-expansion-panel leftChevron .expanded=${true} outlined>
        <h3 slot="header">
          <ha-svg-icon .path=${mdiTextureBox}></ha-svg-icon>
          Areas to show
        </h3>
        <ha-items-display-editor
          .hass=${this.hass}
          .items=${items}
          .value=${value}
          @value-changed=${this._areaDisplayChanged}
        ></ha-items-display-editor>
      </ha-expansion-panel>
    `;
  }

  private _areaDisplayChanged(ev: CustomEvent): void {
    const value = ev.detail.value as DisplayValue;
    const newConfig: AreasDashboardStrategyConfig = {
      ...this._config!,
      hidden_areas: value.hidden,
      areas_order: value.order,
    };
    if (newConfig.hidden_areas?.length === 0) {
      delete newConfig.hidden_areas;
    }
    if (newConfig.areas_order?.length === 0) {
      delete newConfig.areas_order;
    }

    fireEvent(this, "config-changed", { config: newConfig });
  }

  static get styles() {
    return [
      css`
        ha-expansion-panel h3 {
          font-size: 14px;
          font-weight: 500;
          line-height: 20px;
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
