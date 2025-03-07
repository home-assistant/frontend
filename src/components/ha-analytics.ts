import type { CSSResultGroup, TemplateResult } from "lit";
import { css, html, LitElement } from "lit";
import { customElement, property } from "lit/decorators";
import { fireEvent } from "../common/dom/fire_event";
import type { LocalizeFunc } from "../common/translations/localize";
import type { Analytics, AnalyticsPreferences } from "../data/analytics";
import { haStyle } from "../resources/styles";
import "./ha-settings-row";
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
      <ha-settings-row>
        <span slot="heading" data-for="base">
          ${this.localize(
            `ui.panel.${this.translationKeyPanel}.analytics.preferences.base.title`
          )}
        </span>
        <span slot="description" data-for="base">
          ${this.localize(
            `ui.panel.${this.translationKeyPanel}.analytics.preferences.base.description`
          )}
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
        (preference) => html`
          <ha-settings-row>
            <span slot="heading" data-for=${preference}>
              ${this.localize(
                `ui.panel.${this.translationKeyPanel}.analytics.preferences.${preference}.title`
              )}
            </span>
            <span slot="description" data-for=${preference}>
              ${this.localize(
                `ui.panel.${this.translationKeyPanel}.analytics.preferences.${preference}.description`
              )}
            </span>
            <span>
              <ha-tooltip
                content=${this.localize(
                  `ui.panel.${this.translationKeyPanel}.analytics.need_base_enabled`
                )}
                placement="right"
                ?disabled=${baseEnabled}
              >
                <ha-switch
                  @change=${this._handleRowClick}
                  .checked=${this.analytics?.preferences[preference]}
                  .preference=${preference}
                  name=${preference}
                >
                </ha-switch>
              </ha-tooltip>
            </span>
          </ha-settings-row>
        `
      )}
      <ha-settings-row>
        <span slot="heading" data-for="diagnostics">
          ${this.localize(
            `ui.panel.${this.translationKeyPanel}.analytics.preferences.diagnostics.title`
          )}
        </span>
        <span slot="description" data-for="diagnostics">
          ${this.localize(
            `ui.panel.${this.translationKeyPanel}.analytics.preferences.diagnostics.description`
          )}
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
