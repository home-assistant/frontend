import type { CSSResultGroup, TemplateResult } from "lit";
import { css, html, LitElement, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import { consumeLocalize } from "../common/decorators/consume-context-entry";
import { fireEvent } from "../common/dom/fire_event";
import type { LocalizeFunc } from "../common/translations/localize";
import type { Analytics, AnalyticsPreferences } from "../data/analytics";
import { haStyle } from "../resources/styles";
import "./ha-switch";
import type { HaSwitch } from "./ha-switch";
import "./ha-tooltip";
import "./item/ha-row-item";

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
      <ha-row-item>
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
        <ha-switch
          slot="end"
          @change=${this._handleRowClick}
          .checked=${!!baseEnabled}
          .preference=${"base"}
          .disabled=${loading}
          name="base"
        >
          ${this._localize(
            `ui.panel.${this.translationKeyPanel}.analytics.preferences.base.title`
          )}
        </ha-switch>
      </ha-row-item>
      ${ADDITIONAL_PREFERENCES.map(
        (preference) => html`
          <ha-row-item>
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
            <ha-switch
              slot="end"
              .id="switch-${preference}"
              @change=${this._handleRowClick}
              .checked=${!!this.analytics?.preferences[preference]}
              .preference=${preference}
              name=${preference}
            >
              ${this._localize(
                `ui.panel.${this.translationKeyPanel}.analytics.preferences.${preference}.title`
              )}
            </ha-switch>
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
          </ha-row-item>
        `
      )}
      <ha-row-item>
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
        <ha-switch
          slot="end"
          @change=${this._handleRowClick}
          .checked=${!!this.analytics?.preferences.diagnostics}
          .preference=${"diagnostics"}
          .disabled=${loading}
          name="diagnostics"
        >
          ${this._localize(
            `ui.panel.${this.translationKeyPanel}.analytics.preferences.diagnostics.title`
          )}
        </ha-switch>
      </ha-row-item>
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

        /* The visible headline already names the row. Keep the switch's
           slotted label available to assistive technology without repeating it. */
        ha-switch::part(label) {
          position: absolute;
          overflow: hidden;
          clip: rect(0 0 0 0);
          height: 1px;
          width: 1px;
          margin: -1px;
          padding: 0;
          border: 0;
        }

        ha-row-item {
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
