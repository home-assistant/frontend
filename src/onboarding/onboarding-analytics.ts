import "@material/mwc-button/mwc-button";
import {
  css,
  CSSResult,
  customElement,
  html,
  internalProperty,
  LitElement,
  property,
  TemplateResult,
} from "lit-element";
import { fireEvent } from "../common/dom/fire_event";
import { LocalizeFunc } from "../common/translations/localize";
import "../components/ha-analytics";
import {
  Analytics,
  getAnalyticsDetails,
  setAnalyticsPreferences,
} from "../data/analytics";
import { onboardAnalyticsStep } from "../data/onboarding";
import type { HomeAssistant } from "../types";

@customElement("onboarding-analytics")
class OnboardingAnalytics extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property() public localize!: LocalizeFunc;

  @internalProperty() private _error?: string;

  @internalProperty() private _analyticsDetails?: Analytics;

  protected render(): TemplateResult {
    if (!this._analyticsDetails?.huuid) {
      return html``;
    }

    return html`
      <p>
        ${this.localize(
          "ui.panel.page-onboarding.analytics.intro",
          "link",
          html`<a href="https://analytics.home-assistant.io" target="_blank"
            >https://analytics.home-assistant.io</a
          >`
        )}
      </p>
      <ha-analytics
        @analytics-preferences-changed=${this._preferencesChanged}
        .hass=${this.hass}
        .analytics=${this._analyticsDetails}
      >
      </ha-analytics>
      ${this._error ? html`<div class="error">${this._error}</div>` : ""}
      <div class="footer">
        <mwc-button @click=${this._save}>
          ${this.localize("ui.panel.page-onboarding.analytics.finish")}
        </mwc-button>
      </div>
    `;
  }

  protected firstUpdated(changedProps) {
    super.firstUpdated(changedProps);
    this.addEventListener("keypress", (ev) => {
      if (ev.keyCode === 13) {
        this._save(ev);
      }
    });
    this._load();
  }

  private _preferencesChanged(event: CustomEvent): void {
    this._analyticsDetails = {
      ...this._analyticsDetails!,
      preferences: event.detail.preferences,
    };
  }

  private async _save(ev) {
    ev.preventDefault();
    try {
      await setAnalyticsPreferences(
        this.hass,
        this._analyticsDetails!.preferences
      );

      await onboardAnalyticsStep(this.hass);
      fireEvent(this, "onboarding-step", {
        type: "analytics",
      });
    } catch (err) {
      alert(`Failed to save: ${err.message}`);
    }
  }

  private async _load() {
    this._error = undefined;
    try {
      this._analyticsDetails = await getAnalyticsDetails(this.hass);
    } catch (err) {
      this._error = err.message || err;
    }
  }

  static get styles(): CSSResult {
    return css`
      .error {
        color: var(--error-color);
      }

      .footer {
        margin-top: 16px;
        text-align: right;
      }
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "onboarding-analytics": OnboardingAnalytics;
  }
}
