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
  query,
  TemplateResult,
} from "lit-element";
import { isComponentLoaded } from "../../../common/config/is_component_loaded";
import "../../../components/ha-analytics";
import type { HaAnalytics } from "../../../components/ha-analytics";
import "../../../components/ha-card";
import "../../../components/ha-checkbox";
import "../../../components/ha-settings-row";
import {
  Analytics,
  getAnalyticsDetails,
  setAnalyticsPrefrences,
} from "../../../data/analytics";
import { haStyle } from "../../../resources/styles";
import type { HomeAssistant } from "../../../types";

@customElement("ha-config-analytics")
class ConfigAnalytics extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ attribute: false }) private analyticsDetails?: Analytics;

  @internalProperty() private _error?: string;

  @query("ha-analytics") private _analytics?: HaAnalytics;

  protected render(): TemplateResult {
    if (
      !isComponentLoaded(this.hass, "analytics") ||
      !this.hass.user?.is_admin ||
      !this.analyticsDetails?.huuid
    ) {
      return html``;
    }

    return html`
      <ha-card
        .header=${this.hass.localize(
          "ui.panel.config.core.section.core.analytics.header"
        )}
      >
        <div class="card-content">
          ${this._error ? html`<div class="error">${this._error}</div>` : ""}
          <p>
            ${this.hass.localize(
              "ui.panel.config.core.section.core.analytics.introduction",
              "link",
              html`<a
                href="https://analaytics.home-assistant.io"
                target="_blank"
                >https://analaytics.home-assistant.io</a
              >`
            )}
          </p>
          <ha-analytics
            .hass=${this.hass}
            .analytics=${this.analyticsDetails}
          ></ha-analytics>
        </div>
        <div class="card-actions">
          <mwc-button @click=${this._save} .disabled=${false}>
            ${this.hass.localize(
              "ui.panel.config.core.section.core.core_config.save_button"
            )}
          </mwc-button>
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
    this.analyticsDetails = await getAnalyticsDetails(this.hass);
  }

  private async _save() {
    this._error = undefined;
    try {
      this.analyticsDetails!.preferences = await setAnalyticsPrefrences(
        this.hass,
        this._analytics?.analytics.preferences.includes("base")
          ? this._analytics?.analytics.preferences
          : []
      );
    } catch (err) {
      this._error = err.message || err;
    }
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
      `,
    ];
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-config-analytics": ConfigAnalytics;
  }
}
