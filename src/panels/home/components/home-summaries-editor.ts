import { mdiDragHorizontalVariant } from "@mdi/js";
import { css, html, LitElement, nothing } from "lit";
import { customElement, property } from "lit/decorators";
import { repeat } from "lit/directives/repeat";
import { styleMap } from "lit/directives/style-map";
import { computeCssColor } from "../../../common/color/compute-color";
import {
  fireEvent,
  type HASSDomEvent,
  type HASSDomTargetEvent,
} from "../../../common/dom/fire_event";
import "../../../components/ha-icon";
import "../../../components/ha-settings-row";
import "../../../components/ha-sortable";
import "../../../components/ha-svg-icon";
import "../../../components/ha-switch";
import type { HomeSummaryConfig } from "../../../data/frontend";
import {
  getSummaryLabel,
  HOME_SUMMARIES_ICONS,
  type HomeSummary,
} from "../../lovelace/strategies/home/helpers/home-summaries";
import type { HomeAssistant } from "../../../types";

interface SummaryMeta {
  icon: string;
  color: string;
}

// Metadata lookup keyed by summary key — defines icon and color only.
// Order and visibility are driven by the `summaries` property.
const SUMMARY_META: Record<string, SummaryMeta> = {
  light: { icon: HOME_SUMMARIES_ICONS.light, color: "amber" },
  climate: { icon: HOME_SUMMARIES_ICONS.climate, color: "deep-orange" },
  security: { icon: HOME_SUMMARIES_ICONS.security, color: "blue-grey" },
  media_players: { icon: HOME_SUMMARIES_ICONS.media_players, color: "blue" },
  maintenance: { icon: HOME_SUMMARIES_ICONS.maintenance, color: "orange" },
  weather: { icon: "mdi:weather-partly-cloudy", color: "teal" },
  energy: { icon: HOME_SUMMARIES_ICONS.energy, color: "amber" },
};

@customElement("home-summaries-editor")
export class HomeSummariesEditor extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ attribute: false }) public summaries: HomeSummaryConfig[] = [];

  protected render() {
    return html`
      <ha-sortable handle-selector=".handle" @item-moved=${this._moved}>
        <div class="home-list">
          ${repeat(
            this.summaries,
            (item) => item.key,
            (item) => {
              const meta = SUMMARY_META[item.key];
              if (!meta) return nothing;
              const label = this._getSummaryLabel(item.key);
              const color = computeCssColor(meta.color);
              return html`
                <div class="summary-row">
                  <div class="handle">
                    <ha-svg-icon
                      .path=${mdiDragHorizontalVariant}
                    ></ha-svg-icon>
                  </div>
                  <ha-settings-row slim>
                    <ha-icon
                      slot="prefix"
                      .icon=${meta.icon}
                      style=${styleMap({ "--mdc-icon-size": "24px", color })}
                    ></ha-icon>
                    <span slot="heading">${label}</span>
                    <ha-switch
                      .checked=${!item.hidden}
                      .summaryKey=${item.key}
                      @change=${this._toggleChanged}
                    ></ha-switch>
                  </ha-settings-row>
                </div>
              `;
            }
          )}
        </div>
      </ha-sortable>
    `;
  }

  private _getSummaryLabel(key: string): string {
    if (key === "weather") {
      return this.hass.localize(
        "ui.panel.lovelace.strategy.home.summary_list.weather"
      );
    }
    return getSummaryLabel(this.hass.localize, key as HomeSummary);
  }

  private _moved(ev: HASSDomEvent<HASSDomEvents["item-moved"]>): void {
    ev.stopPropagation();
    const { oldIndex, newIndex } = ev.detail;
    const next = [...this.summaries];
    const [moved] = next.splice(oldIndex, 1);
    next.splice(newIndex, 0, moved);
    fireEvent(this, "value-changed", { value: next });
  }

  private _toggleChanged(
    ev: HASSDomTargetEvent<
      HTMLElement & { checked: boolean; summaryKey: string }
    >
  ): void {
    const { checked, summaryKey } = ev.target;
    const next = this.summaries.map((item) =>
      item.key === summaryKey
        ? { ...item, hidden: !checked || undefined }
        : item
    );
    fireEvent(this, "value-changed", { value: next });
  }

  static styles = css`
    .home-list {
      display: flex;
      flex-direction: column;
    }
    .summary-row {
      display: flex;
      align-items: center;
      gap: var(--ha-space-2);
    }
    ha-settings-row {
      flex: 1;
      min-width: 0;
      padding: 0;
      gap: var(--ha-space-3);
      min-height: 40px;
      --settings-row-prefix-display: contents;
      --settings-row-content-display: contents;
      --settings-row-body-padding-top: var(--ha-space-1);
      --settings-row-body-padding-bottom: var(--ha-space-1);
    }
    [slot="heading"] {
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    .handle {
      cursor: grab;
      color: var(--secondary-text-color);
      flex-shrink: 0;
      display: flex;
      align-items: center;
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    "home-summaries-editor": HomeSummariesEditor;
  }
}
