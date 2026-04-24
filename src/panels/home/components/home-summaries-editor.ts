import { css, html, LitElement } from "lit";
import { customElement, property } from "lit/decorators";
import { styleMap } from "lit/directives/style-map";
import { computeCssColor } from "../../../common/color/compute-color";
import {
  fireEvent,
  type HASSDomTargetEvent,
} from "../../../common/dom/fire_event";
import "../../../components/ha-icon";
import "../../../components/ha-switch";
import {
  getSummaryLabel,
  HOME_SUMMARIES_ICONS,
  type HomeSummary,
} from "../../lovelace/strategies/home/helpers/home-summaries";
import type { HomeAssistant } from "../../../types";

interface SummaryInfo {
  key: string;
  icon: string;
  color: string;
}

// Ordered to match dashboard rendering order
const SUMMARY_ITEMS: SummaryInfo[] = [
  { key: "light", icon: HOME_SUMMARIES_ICONS.light, color: "amber" },
  { key: "climate", icon: HOME_SUMMARIES_ICONS.climate, color: "deep-orange" },
  { key: "security", icon: HOME_SUMMARIES_ICONS.security, color: "blue-grey" },
  {
    key: "media_players",
    icon: HOME_SUMMARIES_ICONS.media_players,
    color: "blue",
  },
  {
    key: "maintenance",
    icon: HOME_SUMMARIES_ICONS.maintenance,
    color: "orange",
  },
  { key: "weather", icon: "mdi:weather-partly-cloudy", color: "teal" },
  { key: "energy", icon: HOME_SUMMARIES_ICONS.energy, color: "amber" },
];

@customElement("home-summaries-editor")
export class HomeSummariesEditor extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ attribute: false }) public hiddenSummaries: string[] = [];

  protected render() {
    const hidden = new Set(this.hiddenSummaries);
    return html`
      <div class="home-list">
        ${SUMMARY_ITEMS.map((item) => {
          const label = this._getSummaryLabel(item.key);
          const color = computeCssColor(item.color);
          return html`
            <label class="home-list-item summary-toggle">
              <ha-icon
                .icon=${item.icon}
                style=${styleMap({ "--mdc-icon-size": "24px", color })}
              ></ha-icon>
              <span class="label">${label}</span>
              <ha-switch
                .checked=${!hidden.has(item.key)}
                .summary=${item.key}
                @change=${this._toggleChanged}
              ></ha-switch>
            </label>
          `;
        })}
      </div>
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

  private _toggleChanged(
    ev: HASSDomTargetEvent<
      HTMLElement & {
        checked: boolean;
        summary: string;
      }
    >
  ): void {
    const target = ev.target;
    const hidden = new Set(this.hiddenSummaries);
    if (target.checked) {
      hidden.delete(target.summary);
    } else {
      hidden.add(target.summary);
    }
    fireEvent(this, "value-changed", { value: [...hidden] });
  }

  static styles = css`
    .home-list {
      display: flex;
      flex-direction: column;
    }
    .summary-toggle {
      display: flex;
      align-items: center;
      gap: var(--ha-space-3);
      padding: var(--ha-space-2) 0;
      cursor: pointer;
    }
    .summary-toggle .label {
      flex: 1;
      font-size: 14px;
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    "home-summaries-editor": HomeSummariesEditor;
  }
}
