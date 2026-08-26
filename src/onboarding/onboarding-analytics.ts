import { mdiOpenInNew } from "@mdi/js";
import type { CSSResultGroup, TemplateResult, PropertyValues } from "lit";
import { css, html, LitElement } from "lit";
import { customElement, property, state } from "lit/decorators";
import { fireEvent, type HASSDomEvent } from "../common/dom/fire_event";
import type { LocalizeFunc } from "../common/translations/localize";
import "../components/ha-analytics";
import "../components/ha-button";
import "../components/ha-spinner";
import "../components/ha-svg-icon";
import type { Analytics } from "../data/analytics";
import {
  getAnalyticsDetails,
  setAnalyticsPreferences,
} from "../data/analytics";
import { onboardAnalyticsStep } from "../data/onboarding";
import type { HomeAssistant } from "../types";
import { documentationUrl } from "../util/documentation-url";
import { onBoardingStyles } from "./styles";

@customElement("onboarding-analytics")
class OnboardingAnalytics extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ attribute: false }) public localize!: LocalizeFunc;

  @state() private _error?: string;

  // Undefined while we are still waiting for the analytics integration to be
  // set up (Home Assistant may still be starting up during onboarding).
  @state() private _analyticsDetails?: Analytics;

  private _retryTimeout?: number;

  protected render(): TemplateResult {
    return html`
      <h1>${this.localize("ui.panel.page-onboarding.analytics.header")}</h1>
      <p>${this.localize("ui.panel.page-onboarding.analytics.intro")}</p>
      <p>
        <a
          href=${documentationUrl(this.hass, "/integrations/analytics/")}
          target="_blank"
          rel="noreferrer"
        >
          ${this.localize("ui.panel.page-onboarding.analytics.learn_more")}
          <ha-svg-icon .path=${mdiOpenInNew}></ha-svg-icon>
        </a>
      </p>
      ${
        this._analyticsDetails
          ? html`
              <ha-analytics
                translation_key_panel="page-onboarding"
                @analytics-preferences-changed=${this._preferencesChanged}
                .localize=${this.localize}
                .analytics=${this._analyticsDetails}
              >
              </ha-analytics>
            `
          : html`
              <div class="loading">
                <ha-spinner></ha-spinner>
                <p>
                  ${this.localize("ui.panel.page-onboarding.analytics.waiting")}
                </p>
              </div>
            `
      }
      ${this._error ? html`<div class="error">${this._error}</div>` : ""}
      <div class="footer">
        <ha-button @click=${this._save} .disabled=${!this._analyticsDetails}>
          ${this.localize("ui.panel.page-onboarding.analytics.finish")}
        </ha-button>
      </div>
    `;
  }

  protected firstUpdated(changedProps: PropertyValues<this>) {
    super.firstUpdated(changedProps);
    this.addEventListener("keypress", (ev) => {
      if (ev.key === "Enter") {
        this._save(ev);
      }
    });
    this._loadAnalyticsDetails();
  }

  public disconnectedCallback(): void {
    super.disconnectedCallback();
    if (this._retryTimeout) {
      clearTimeout(this._retryTimeout);
      this._retryTimeout = undefined;
    }
  }

  private async _loadAnalyticsDetails(): Promise<void> {
    try {
      // The analytics integration registers its WebSocket commands during
      // setup, but only stores its data once the config entry is set up. On a
      // fresh install we can reach this step before that happened, so keep
      // retrying until it is ready instead of failing on save.
      this._analyticsDetails = await getAnalyticsDetails(this.hass);
      this._error = undefined;
    } catch (err: any) {
      if (err.code === "not_found") {
        this._retryTimeout = window.setTimeout(
          () => this._loadAnalyticsDetails(),
          1000
        );
        return;
      }
      this._error = err.message;
    }
  }

  private _preferencesChanged(
    event: HASSDomEvent<HASSDomEvents["analytics-preferences-changed"]>
  ): void {
    this._analyticsDetails = {
      ...this._analyticsDetails!,
      preferences: event.detail.preferences,
    };
  }

  private async _save(ev) {
    ev.preventDefault();
    if (!this._analyticsDetails) {
      return;
    }
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
        .loading {
          display: flex;
          flex-direction: column;
          align-items: center;
          text-align: center;
          padding: 24px 0;
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
