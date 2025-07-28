import { mdiOpenInNew } from "@mdi/js";
import type { CSSResultGroup, PropertyValues, TemplateResult } from "lit";
import { css, html, LitElement } from "lit";
import { customElement, property, state } from "lit/decorators";
import { isComponentLoaded } from "../../../common/config/is_component_loaded";
import "../../../components/ha-analytics";
import "../../../components/ha-button";
import "../../../components/ha-card";
import "../../../components/ha-checkbox";
import "../../../components/ha-settings-row";
import "../../../components/ha-svg-icon";
import type { Analytics } from "../../../data/analytics";
import {
  getAnalyticsDetails,
  setAnalyticsPreferences,
} from "../../../data/analytics";
import { haStyle } from "../../../resources/styles";
import type { HomeAssistant } from "../../../types";
import { documentationUrl } from "../../../util/documentation-url";

@customElement("ha-config-analytics")
class ConfigAnalytics extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @state() private _analyticsDetails?: Analytics;

  @state() private _error?: string;

  protected render(): TemplateResult {
    const error = this._error
      ? this._error
      : !isComponentLoaded(this.hass, "analytics")
        ? "Analytics integration not loaded"
        : undefined;

    return html`
      <ha-card outlined>
        <div class="card-content">
          ${error ? html`<div class="error">${error}</div>` : ""}
          <p>${this.hass.localize("ui.panel.config.analytics.intro")}</p>
          <ha-analytics
            translation_key_panel="config"
            @analytics-preferences-changed=${this._preferencesChanged}
            .localize=${this.hass.localize}
            .analytics=${this._analyticsDetails}
          ></ha-analytics>
        </div>
        <div class="card-actions">
          <ha-button appearance="plain" @click=${this._save}>
            ${this.hass.localize(
              "ui.panel.config.core.section.core.core_config.save_button"
            )}
          </ha-button>
        </div>
      </ha-card>
      <div class="footer">
        <ha-button
          size="small"
          appearance="plain"
          href=${documentationUrl(this.hass, "/integrations/analytics/")}
          target="_blank"
          rel="noreferrer"
        >
          <ha-svg-icon slot="end" .path=${mdiOpenInNew}></ha-svg-icon>
          ${this.hass.localize("ui.panel.config.analytics.learn_more")}
        </ha-button>
      </div>
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
    } catch (err: any) {
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
    } catch (err: any) {
      this._error = err.message || err;
    }
  }

  private _preferencesChanged(event: CustomEvent): void {
    this._analyticsDetails = {
      ...this._analyticsDetails!,
      preferences: event.detail.preferences,
    };
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
        p {
          margin-top: 0;
        }
        .card-actions {
          display: flex;
          flex-direction: row-reverse;
          justify-content: space-between;
          align-items: center;
        }
        .footer {
          padding: 32px 0 16px;
          text-align: center;
        }

        ha-button[size="small"] ha-svg-icon {
          --mdc-icon-size: 16px;
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
