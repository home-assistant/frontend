import "@polymer/paper-tooltip/paper-tooltip";
import { css, CSSResultGroup, html, LitElement, TemplateResult } from "lit";
import { customElement, property } from "lit/decorators";
import { fireEvent } from "../common/dom/fire_event";
import type { Analytics, AnalyticsPreferences } from "../data/analytics";
import { haStyle } from "../resources/styles";
import type { HomeAssistant } from "../types";
import "./ha-settings-row";
import "./ha-switch";
import type { HaSwitch } from "./ha-switch";

const ADDITIONAL_PREFERENCES = [
  {
    key: "usage",
    title: "Usage",
    description: "Details of what you use with Home Assistant",
  },
  {
    key: "statistics",
    title: "Statistical data",
    description: "Counts containing total number of datapoints",
  },
];

declare global {
  interface HASSDomEvents {
    "analytics-preferences-changed": { preferences: AnalyticsPreferences };
  }
}

@customElement("ha-analytics")
export class HaAnalytics extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ attribute: false }) public analytics?: Analytics;

  protected render(): TemplateResult {
    const loading = this.analytics === undefined;
    const baseEnabled = !loading && this.analytics!.preferences.base;

    return html`
      <ha-settings-row>
        <span slot="heading" data-for="base"> Basic analytics </span>
        <span slot="description" data-for="base">
          This includes information about your system.
        </span>
        <ha-switch
          @change=${this._handleRowClick}
          .checked=${baseEnabled}
          .preference=${"base"}
          .disabled=${loading}
          name="base"
        >
        </ha-switch>
      </ha-settings-row>
      ${ADDITIONAL_PREFERENCES.map(
        (preference) =>
          html`
            <ha-settings-row>
              <span slot="heading" data-for=${preference.key}>
                ${preference.title}
              </span>
              <span slot="description" data-for=${preference.key}>
                ${preference.description}
              </span>
              <span>
                <ha-switch
                  @change=${this._handleRowClick}
                  .checked=${this.analytics?.preferences[preference.key]}
                  .preference=${preference.key}
                  name=${preference.key}
                >
                </ha-switch>
                ${!baseEnabled
                  ? html`
                      <paper-tooltip animation-delay="0" position="right">
                        You need to enable basic analytics for this option to be
                        available
                      </paper-tooltip>
                    `
                  : ""}
              </span>
            </ha-settings-row>
          `
      )}
      <ha-settings-row>
        <span slot="heading" data-for="diagnostics"> Diagnostics </span>
        <span slot="description" data-for="diagnostics">
          Share crash reports when unexpected errors occur.
        </span>
        <ha-switch
          @change=${this._handleRowClick}
          .checked=${this.analytics?.preferences.diagnostics}
          .preference=${"diagnostics"}
          .disabled=${loading}
          name="diagnostics"
        >
        </ha-switch>
      </ha-settings-row>
    `;
  }

  protected updated(changedProps) {
    super.updated(changedProps);

    this.shadowRoot!.querySelectorAll("*[data-for]").forEach((el) => {
      const forEl = (el as HTMLElement).dataset.for;
      delete (el as HTMLElement).dataset.for;

      el.addEventListener("click", () => {
        const toFocus = this.shadowRoot!.querySelector(
          `*[name=${forEl}]`
        ) as HTMLElement | null;

        if (toFocus) {
          toFocus.focus();
          toFocus.click();
        }
      });
    });
  }

  private _handleRowClick(ev: Event) {
    const target = ev.currentTarget as HaSwitch;
    const preference = (target as any).preference;
    const preferences = this.analytics ? { ...this.analytics.preferences } : {};

    if (preferences[preference] === target.checked) {
      return;
    }

    preferences[preference] = target.checked;

    if (
      ADDITIONAL_PREFERENCES.some((entry) => entry.key === preference) &&
      target.checked
    ) {
      preferences.base = true;
    } else if (preference === "base" && !target.checked) {
      preferences.usage = false;
      preferences.statistics = false;
    }

    fireEvent(this, "analytics-preferences-changed", { preferences });
  }

  static get styles(): CSSResultGroup {
    return [
      haStyle,
      css`
        .error {
          color: var(--error-color);
        }

        ha-settings-row {
          padding: 0;
        }

        span[slot="heading"],
        span[slot="description"] {
          cursor: pointer;
        }
      `,
    ];
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-analytics": HaAnalytics;
  }
}
