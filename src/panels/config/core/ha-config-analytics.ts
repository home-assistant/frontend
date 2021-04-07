import "@material/mwc-button/mwc-button";
import {
  css,
  CSSResult,
  customElement,
  html,
  internalProperty,
  LitElement,
  property,
  PropertyValues,
  TemplateResult,
} from "lit-element";
import { isComponentLoaded } from "../../../common/config/is_component_loaded";
import "../../../components/ha-analytics";
import { analyticsLearnMore } from "../../../components/ha-analytics-learn-more";
import "../../../components/ha-card";
import "../../../components/ha-checkbox";
import "../../../components/ha-settings-row";
import {
  Analytics,
  getAnalyticsDetails,
  setAnalyticsPreferences,
} from "../../../data/analytics";
import { haStyle } from "../../../resources/styles";
import type { HomeAssistant } from "../../../types";

@customElement("ha-config-analytics")
class ConfigAnalytics extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @internalProperty() private _analyticsDetails?: Analytics;

  @internalProperty() private _error?: string;

  protected render(): TemplateResult {
    const error = this._error
      ? this._error
      : !isComponentLoaded(this.hass, "analytics")
      ? "Analytics integration not loaded"
      : undefined;

    return html`
      <ha-card
        .header=${this.hass.localize(
          "ui.panel.config.core.section.core.analytics.header"
        )}
      >
        <div class="card-content">
          ${error ? html`<div class="error">${error}</div>` : ""}
          <p>
            ${this.hass.localize(
              "ui.panel.config.core.section.core.analytics.introduction",
              "link",
              html`<a href="https://analytics.home-assistant.io" target="_blank"
                >analytics.home-assistant.io</a
              >`
            )}
          </p>
          <ha-analytics
            @analytics-preferences-changed=${this._preferencesChanged}
            .hass=${this.hass}
            .analytics=${this._analyticsDetails}
          ></ha-analytics>
        </div>
        <div class="card-actions">
          <mwc-button @click=${this._save}>
            ${this.hass.localize(
              "ui.panel.config.core.section.core.core_config.save_button"
            )}
          </mwc-button>
          ${analyticsLearnMore(this.hass)}
        </div>
      </ha-card>
    `;
  }

  protected firstUpdated(changedProps: PropertyValues) {
    super.firstUpdated(changedProps);
    if (isComponentLoaded(this.hass, "analytics")) {
      this._load();
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

  private async _save() {
    this._error = undefined;
    try {
      await setAnalyticsPreferences(
        this.hass,
        this._analyticsDetails?.preferences || {}
      );
    } catch (err) {
      this._error = err.message || err;
    }
  }

  private _preferencesChanged(event: CustomEvent): void {
    this._analyticsDetails = {
      ...this._analyticsDetails!,
      preferences: event.detail.preferences,
    };
  }

  static get styles(): CSSResult[] {
    return [
      haStyle,
      css`
        .error {
          color: var(--error-color);
        }

        ha-settings-row {
          padding: 0;
        }

        .card-actions {
          display: flex;
          flex-direction: row-reverse;
          justify-content: space-between;
          align-items: center;
        }
      `, // row-reverse so we tab first to "save"
    ];
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-config-analytics": ConfigAnalytics;
  }
}
