import "@material/mwc-button/mwc-button";
import {
  css,
  CSSResultGroup,
  html,
  LitElement,
  nothing,
  PropertyValues,
  TemplateResult,
} from "lit";
import { customElement, property, state } from "lit/decorators";
import { fireEvent } from "../common/dom/fire_event";
import type { LocalizeFunc } from "../common/translations/localize";
import "../components/ha-alert";
import "../components/ha-country-picker";
import { ConfigUpdateValues, saveCoreConfig } from "../data/core";
import { countryCurrency } from "../data/currency";
import { onboardCoreConfigStep } from "../data/onboarding";
import type { HomeAssistant, ValueChangedEvent } from "../types";
import { getLocalLanguage } from "../util/common-translation";
import "./onboarding-location";

@customElement("onboarding-core-config")
class OnboardingCoreConfig extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property() public onboardingLocalize!: LocalizeFunc;

  @state() private _working = false;

  @state() private _location?: [number, number];

  private _elevation = "0";

  private _timeZone: ConfigUpdateValues["time_zone"] =
    Intl.DateTimeFormat?.().resolvedOptions?.().timeZone;

  private _language: ConfigUpdateValues["language"] = getLocalLanguage();

  @state() private _country?: ConfigUpdateValues["country"];

  private _unitSystem?: ConfigUpdateValues["unit_system"];

  private _currency?: ConfigUpdateValues["currency"];

  @state() private _error?: string;

  @state() private _skipCore = false;

  protected render(): TemplateResult {
    if (!this._location) {
      return html`<onboarding-location
        .hass=${this.hass}
        .onboardingLocalize=${this.onboardingLocalize}
        @value-changed=${this._locationChanged}
      ></onboarding-location>`;
    }
    if (this._skipCore) {
      return html`<div class="row center">
        <ha-circular-progress active></ha-circular-progress>
      </div>`;
    }
    return html`
      ${this._error
        ? html`<ha-alert alert-type="error">${this._error}</ha-alert>`
        : nothing}

      <p>
        ${this.onboardingLocalize(
          "ui.panel.page-onboarding.core-config.country_intro"
        )}
      </p>

      <ha-country-picker
        class="flex"
        .language=${this.hass.locale.language}
        .label=${this.hass.localize(
          "ui.panel.config.core.section.core.core_config.country"
        ) || "Country"}
        required
        .disabled=${this._working}
        .value=${this._countryValue}
        @value-changed=${this._handleCountryChanged}
      >
      </ha-country-picker>

      <div class="footer">
        <mwc-button @click=${this._save} .disabled=${this._working}>
          ${this.onboardingLocalize(
            "ui.panel.page-onboarding.core-config.finish"
          )}
        </mwc-button>
      </div>
    `;
  }

  protected firstUpdated(changedProps: PropertyValues) {
    super.firstUpdated(changedProps);
    this.addEventListener("keyup", (ev) => {
      if (this._location && ev.key === "Enter") {
        this._save(ev);
      }
    });
  }

  private get _countryValue() {
    return this._country || "";
  }

  private _handleCountryChanged(ev: ValueChangedEvent<string>) {
    this._country = ev.detail.value;
  }

  private async _locationChanged(ev) {
    this._location = ev.detail.value.location;
    if (ev.detail.value.country) {
      this._country = ev.detail.value.country;
    }
    if (ev.detail.value.elevation) {
      this._elevation = ev.detail.value.elevation;
    }
    if (ev.detail.value.currency) {
      this._currency = ev.detail.value.currency;
    }
    if (ev.detail.value.language) {
      this._language = ev.detail.value.language;
    }
    if (ev.detail.value.timezone) {
      this._timeZone = ev.detail.value.timezone;
    }
    if (ev.detail.value.unit_system) {
      this._unitSystem = ev.detail.value.unit_system;
    }
    if (this._country) {
      this._skipCore = true;
      this._save(ev);
      return;
    }
    fireEvent(this, "onboarding-progress", { increase: 0.5 });
    await this.updateComplete;
    setTimeout(
      () => this.renderRoot.querySelector("ha-country-picker")!.focus(),
      100
    );
  }

  private async _save(ev) {
    if (!this._location || !this._country) {
      return;
    }
    ev.preventDefault();
    this._working = true;
    try {
      await saveCoreConfig(this.hass, {
        location_name: this.onboardingLocalize(
          "ui.panel.page-onboarding.core-config.location_name_default"
        ),
        latitude: this._location[0],
        longitude: this._location[1],
        elevation: Number(this._elevation),
        unit_system:
          this._unitSystem || ["US", "MM", "LR"].includes(this._country)
            ? "us_customary"
            : "metric",
        time_zone: this._timeZone || "UTC",
        currency: this._currency || countryCurrency[this._country] || "EUR",
        country: this._country,
        language: this._language,
      });
      const result = await onboardCoreConfigStep(this.hass);
      fireEvent(this, "onboarding-step", {
        type: "core_config",
        result,
      });
    } catch (err: any) {
      this._skipCore = false;
      this._working = false;
      this._error = err.message;
    }
  }

  static get styles(): CSSResultGroup {
    return css`
      .row {
        display: flex;
        flex-direction: row;
        margin: 0 -8px;
        align-items: center;
        --ha-select-min-width: 100px;
      }

      .secondary {
        color: var(--secondary-text-color);
      }

      p {
        font-size: 14px;
        line-height: 20px;
      }

      ha-textfield {
        display: block;
      }

      .flex {
        flex: 1;
      }

      .middle-text {
        margin: 16px 0;
      }

      .row {
        margin-top: 16px;
      }

      .center {
        justify-content: center;
      }

      .row > * {
        margin: 0 8px;
      }

      .radio-group {
        display: flex;
        flex-direction: column;
        flex: 1;
      }

      .footer {
        margin-top: 16px;
        text-align: right;
      }
      a {
        color: var(--primary-color);
      }
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "onboarding-core-config": OnboardingCoreConfig;
  }
}
