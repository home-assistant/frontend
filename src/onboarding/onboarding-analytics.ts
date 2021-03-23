import "@material/mwc-button/mwc-button";
import {
  css,
  CSSResult,
  customElement,
  html,
  internalProperty,
  LitElement,
  property,
  query,
  TemplateResult,
} from "lit-element";
import { fireEvent } from "../common/dom/fire_event";
import { LocalizeFunc } from "../common/translations/localize";
import "../components/ha-analytics";
import type { HaAnalytics } from "../components/ha-analytics";
import "../components/map/ha-location-editor";
import {
  Analytics,
  getAnalyticsDetails,
  setAnalyticsPrefrences,
} from "../data/analytics";
import { onboardAnalyticsStep } from "../data/onboarding";
import type { HomeAssistant } from "../types";

@customElement("onboarding-analytics")
class OnboardingAnalytics extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ attribute: false }) private analyticsDetails?: Analytics;

  @property() public onboardingLocalize!: LocalizeFunc;

  @internalProperty() private _error?: string;

  @query("ha-analytics") private _analytics?: HaAnalytics;

  protected render(): TemplateResult {
    if (!this.analyticsDetails?.huuid) {
      return html``;
    }

    return html`
      <p>
        ${this.onboardingLocalize(
          "ui.panel.page-onboarding.analytics.intro",
          "link",
          html`<a href="https://analaytics.home-assistant.io" target="_blank"
            >https://analaytics.home-assistant.io</a
          >`
        )}
      </p>
      <ha-analytics .hass=${this.hass} .analaytics=${this.analyticsDetails}>
      </ha-analytics>
      ${this._error ? html`<div class="error">${this._error}</div>` : ""}
      <div class="footer">
        <mwc-button @click=${this._save}>
          ${this.onboardingLocalize(
            "ui.panel.page-onboarding.analytics.finish"
          )}
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

  private async _save(ev) {
    ev.preventDefault();
    try {
      await setAnalyticsPrefrences(
        this.hass,
        this._analytics?.analytics.preferences.includes("base")
          ? this._analytics?.analytics.preferences
          : []
      );

      const result = await onboardAnalyticsStep(this.hass);
      fireEvent(this, "onboarding-step", {
        type: "analytics",
        result,
      });
    } catch (err) {
      alert(`Failed to save: ${err.message}`);
    }
  }

  private async _load() {
    this.analyticsDetails = await getAnalyticsDetails(this.hass);
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
