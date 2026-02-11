import type { CSSResultGroup, TemplateResult } from "lit";
import { css, html, LitElement, nothing } from "lit";
import { customElement, property } from "lit/decorators";
import { fireEvent } from "../common/dom/fire_event";
import type { LocalizeFunc } from "../common/translations/localize";
import type { Analytics, AnalyticsPreferences } from "../data/analytics";
import { haStyle } from "../resources/styles";
import "./ha-md-list-item";
import "./ha-switch";
import "./ha-tooltip";
import type { HaSwitch } from "./ha-switch";

const ADDITIONAL_PREFERENCES = ["usage", "statistics"] as const;

declare global {
  interface HASSDomEvents {
    "analytics-preferences-changed": { preferences: AnalyticsPreferences };
  }
}

@customElement("ha-analytics")
export class HaAnalytics extends LitElement {
  @property({ attribute: false }) public localize!: LocalizeFunc;

  @property({ attribute: false }) public analytics?: Analytics;

  @property({ attribute: "translation_key_panel" }) public translationKeyPanel:
    | "page-onboarding"
    | "config" = "config";

  protected render(): TemplateResult {
    const loading = this.analytics === undefined;
    const baseEnabled = !loading && this.analytics!.preferences.base;

    return html`
      <ha-md-list-item>
        <span slot="headline"
          >${this.localize(
            `ui.panel.${this.translationKeyPanel}.analytics.preferences.base.title`
          )}</span
        >
        <span slot="supporting-text"
          >${this.localize(
            `ui.panel.${this.translationKeyPanel}.analytics.preferences.base.description`
          )}</span
        >
        <ha-switch
          slot="end"
          @change=${this._handleRowClick}
          .checked=${!!baseEnabled}
          .preference=${"base"}
          .disabled=${loading}
          name="base"
        ></ha-switch>
      </ha-md-list-item>
      ${ADDITIONAL_PREFERENCES.map(
        (preference) => html`
          <ha-md-list-item>
            <span slot="headline"
              >${this.localize(
                `ui.panel.${this.translationKeyPanel}.analytics.preferences.${preference}.title`
              )}</span
            >
            <span slot="supporting-text"
              >${this.localize(
                `ui.panel.${this.translationKeyPanel}.analytics.preferences.${preference}.description`
              )}</span
            >
            <ha-switch
              slot="end"
              .id="switch-${preference}"
              @change=${this._handleRowClick}
              .checked=${!!this.analytics?.preferences[preference]}
              .preference=${preference}
              name=${preference}
            ></ha-switch>
            ${baseEnabled
              ? nothing
              : html`<ha-tooltip .for="switch-${preference}" placement="right">
                  ${this.localize(
                    `ui.panel.${this.translationKeyPanel}.analytics.need_base_enabled`
                  )}
                </ha-tooltip>`}
          </ha-md-list-item>
        `
      )}
      <ha-md-list-item>
        <span slot="headline"
          >${this.localize(
            `ui.panel.${this.translationKeyPanel}.analytics.preferences.diagnostics.title`
          )}</span
        >
        <span slot="supporting-text"
          >${this.localize(
            `ui.panel.${this.translationKeyPanel}.analytics.preferences.diagnostics.description`
          )}</span
        >
        <ha-switch
          slot="end"
          @change=${this._handleRowClick}
          .checked=${!!this.analytics?.preferences.diagnostics}
          .preference=${"diagnostics"}
          .disabled=${loading}
          name="diagnostics"
        ></ha-switch>
      </ha-md-list-item>
    `;
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
      ADDITIONAL_PREFERENCES.some((entry) => entry === preference) &&
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

        ha-md-list-item {
          --md-list-item-leading-space: 0;
          --md-list-item-trailing-space: 0;
          --md-item-overflow: visible;
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
