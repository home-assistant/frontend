import type { CSSResultGroup, TemplateResult } from "lit";
import { css, html, LitElement, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import { consumeLocalize } from "../common/decorators/consume-context-entry";
import { fireEvent } from "../common/dom/fire_event";
import type { HASSDomCurrentTargetEvent } from "../common/dom/fire_event";
import type { LocalizeFunc } from "../common/translations/localize";
import type { Analytics, AnalyticsPreferences } from "../data/analytics";
import { haStyle } from "../resources/styles";
import "./ha-tooltip";
import "./item/ha-list-item-switch";
import type { HaListItemSwitch } from "./item/ha-list-item-switch";

const ADDITIONAL_PREFERENCES = ["usage", "statistics"] as const;

declare global {
  interface HASSDomEvents {
    "analytics-preferences-changed": { preferences: AnalyticsPreferences };
  }
}

@customElement("ha-analytics")
export class HaAnalytics extends LitElement {
  @property({ attribute: false }) public analytics?: Analytics;

  @property({ attribute: "translation_key_panel" }) public translationKeyPanel:
    "page-onboarding" | "config" = "config";

  @state()
  @consumeLocalize()
  private _localize!: LocalizeFunc;

  protected render(): TemplateResult {
    const loading = this.analytics === undefined;
    const baseEnabled = !loading && this.analytics!.preferences.base;

    return html`
      <ha-list-item-switch
        @change=${this._handleRowClick}
        .checked=${!!baseEnabled}
        .preference=${"base"}
        .disabled=${loading}
      >
        <span slot="headline"
          >${this._localize(
            `ui.panel.${this.translationKeyPanel}.analytics.preferences.base.title`
          )}</span
        >
        <span slot="supporting-text"
          >${this._localize(
            `ui.panel.${this.translationKeyPanel}.analytics.preferences.base.description`
          )}</span
        >
      </ha-list-item-switch>
      ${ADDITIONAL_PREFERENCES.map(
        (preference) => html`
          <ha-list-item-switch
            .id="switch-${preference}"
            @change=${this._handleRowClick}
            .checked=${!!this.analytics?.preferences[preference]}
            .preference=${preference}
          >
            <span slot="headline"
              >${this._localize(
                `ui.panel.${this.translationKeyPanel}.analytics.preferences.${preference}.title`
              )}</span
            >
            <span slot="supporting-text"
              >${this._localize(
                `ui.panel.${this.translationKeyPanel}.analytics.preferences.${preference}.description`
              )}</span
            >
            ${
              baseEnabled
                ? nothing
                : html`<ha-tooltip
                    .for="switch-${preference}"
                    placement="right"
                  >
                    ${this._localize(
                      `ui.panel.${this.translationKeyPanel}.analytics.need_base_enabled`
                    )}
                  </ha-tooltip>`
            }
          </ha-list-item-switch>
        `
      )}
      <ha-list-item-switch
        @change=${this._handleRowClick}
        .checked=${!!this.analytics?.preferences.diagnostics}
        .preference=${"diagnostics"}
        .disabled=${loading}
      >
        <span slot="headline"
          >${this._localize(
            `ui.panel.${this.translationKeyPanel}.analytics.preferences.diagnostics.title`
          )}</span
        >
        <span slot="supporting-text"
          >${this._localize(
            `ui.panel.${this.translationKeyPanel}.analytics.preferences.diagnostics.description`
          )}</span
        >
      </ha-list-item-switch>
    `;
  }

  private _handleRowClick(
    ev: HASSDomCurrentTargetEvent<
      HaListItemSwitch & { preference: keyof AnalyticsPreferences }
    >
  ) {
    const target = ev.currentTarget;
    const preference = target.preference;
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

        ha-list-item-switch {
          --ha-row-item-padding-inline: 0;
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
