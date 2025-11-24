import type { CSSResultGroup, PropertyValues, TemplateResult } from "lit";
import { css, html, LitElement, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import { isComponentLoaded } from "../../../common/config/is_component_loaded";
import "../../../components/ha-analytics";
import "../../../components/ha-card";
import "../../../components/ha-settings-row";
import type { Analytics } from "../../../data/analytics";
import {
  getAnalyticsDetails,
  setAnalyticsPreferences,
} from "../../../data/analytics";
import { haStyle } from "../../../resources/styles";
import type { HomeAssistant } from "../../../types";
import { documentationUrl } from "../../../util/documentation-url";
import type { HaSwitch } from "../../../components/ha-switch";
import "../../../components/ha-alert";

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
      <ha-card
        outlined
        .header=${this.hass.localize("ui.panel.config.analytics.header") ||
        "Home Assistant analytics"}
      >
        <div class="card-content">
          ${error ? html`<div class="error">${error}</div>` : nothing}
          <p>
            ${this.hass.localize("ui.panel.config.analytics.intro")}
            <a
              href=${documentationUrl(this.hass, "/integrations/analytics/")}
              target="_blank"
              rel="noreferrer"
              >${this.hass.localize("ui.panel.config.analytics.learn_more")}</a
            >.
          </p>
          <ha-analytics
            translation_key_panel="config"
            @analytics-preferences-changed=${this._preferencesChanged}
            .localize=${this.hass.localize}
            .analytics=${this._analyticsDetails}
          ></ha-analytics>
        </div>
      </ha-card>
      ${this._analyticsDetails &&
      "snapshots" in this._analyticsDetails.preferences
        ? html`<ha-card
            outlined
            .header=${this.hass.localize(
              "ui.panel.config.analytics.preferences.snapshots.header"
            )}
          >
            <div class="card-content">
              <p>
                ${this.hass.localize(
                  "ui.panel.config.analytics.preferences.snapshots.info"
                )}
                <a
                  href=${documentationUrl(this.hass, "/device-database/")}
                  target="_blank"
                  rel="noreferrer"
                  >${this.hass.localize(
                    "ui.panel.config.analytics.preferences.snapshots.learn_more"
                  )}</a
                >.
              </p>
              <ha-alert
                .title=${this.hass.localize(
                  "ui.panel.config.analytics.preferences.snapshots.alert.title"
                )}
                >${this.hass.localize(
                  "ui.panel.config.analytics.preferences.snapshots.alert.content"
                )}</ha-alert
              >
              <ha-settings-row>
                <span slot="heading" data-for="snapshots">
                  ${this.hass.localize(
                    `ui.panel.config.analytics.preferences.snapshots.title`
                  )}
                </span>
                <span slot="description" data-for="snapshots">
                  ${this.hass.localize(
                    `ui.panel.config.analytics.preferences.snapshots.description`
                  )}
                </span>
                <ha-switch
                  @change=${this._handleDeviceRowClick}
                  .checked=${!!this._analyticsDetails?.preferences.snapshots}
                  .disabled=${this._analyticsDetails === undefined}
                  name="snapshots"
                >
                </ha-switch>
              </ha-settings-row>
            </div>
          </ha-card>`
        : nothing}
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

  private _handleDeviceRowClick(ev: Event) {
    const target = ev.target as HaSwitch;

    this._analyticsDetails = {
      ...this._analyticsDetails!,
      preferences: {
        ...this._analyticsDetails!.preferences,
        snapshots: target.checked,
      },
    };
    this._save();
  }

  private _preferencesChanged(event: CustomEvent): void {
    this._analyticsDetails = {
      ...this._analyticsDetails!,
      preferences: event.detail.preferences,
    };
    this._save();
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
        ha-card:not(:first-of-type) {
          margin-top: 24px;
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
