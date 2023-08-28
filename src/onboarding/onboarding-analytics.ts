import "@material/mwc-button/mwc-button";
import { mdiOpenInNew } from "@mdi/js";
import { css, CSSResultGroup, html, LitElement, TemplateResult } from "lit";
import { customElement, property, state } from "lit/decorators";
import { fireEvent } from "../common/dom/fire_event";
import { LocalizeFunc } from "../common/translations/localize";
import "../components/ha-analytics";
import { Analytics, setAnalyticsPreferences } from "../data/analytics";
import { onboardAnalyticsStep } from "../data/onboarding";
import type { HomeAssistant } from "../types";
import { documentationUrl } from "../util/documentation-url";
import { onBoardingStyles } from "./styles";

@customElement("onboarding-analytics")
class OnboardingAnalytics extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property() public localize!: LocalizeFunc;

  @state() private _error?: string;

  @state() private _analyticsDetails: Analytics = {
    preferences: {},
  };

  protected render(): TemplateResult {
    return html`
      <h1>${this.localize("ui.panel.page-onboarding.analytics.header")}</h1>
      <p>${this.localize("ui.panel.page-onboarding.analytics.intro")}</p>
      <p>
        <a
          .href=${documentationUrl(this.hass, "/integrations/analytics/")}
          target="_blank"
          rel="noreferrer"
        >
          ${this.localize("ui.panel.page-onboarding.analytics.learn_more")}
          <ha-svg-icon .path=${mdiOpenInNew}></ha-svg-icon>
        </a>
      </p>
      <ha-analytics
        translation_key_panel="page-onboarding"
        @analytics-preferences-changed=${this._preferencesChanged}
        .localize=${this.localize}
        .analytics=${this._analyticsDetails}
      >
      </ha-analytics>
      ${this._error ? html`<div class="error">${this._error}</div>` : ""}
      <div class="footer">
        <mwc-button
          unelevated
          @click=${this._save}
          .disabled=${!this._analyticsDetails}
        >
          ${this.localize("ui.panel.page-onboarding.analytics.finish")}
        </mwc-button>
      </div>
    `;
  }

  protected firstUpdated(changedProps) {
    super.firstUpdated(changedProps);
    this.addEventListener("keypress", (ev) => {
      if (ev.key === "Enter") {
        this._save(ev);
      }
    });
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
    } catch (err: any) {
      alert(`Failed to save: ${err.message}`);
    }
  }

  static get styles(): CSSResultGroup {
    return [
      onBoardingStyles,
      css`
        .error {
          color: var(--error-color);
        }
        a {
          color: var(--primary-color);
          text-decoration: none;
          --mdc-icon-size: 14px;
        }
      `,
    ];
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "onboarding-analytics": OnboardingAnalytics;
  }
}
