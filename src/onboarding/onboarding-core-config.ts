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
import "../components/ha-currency-picker";
import "../components/ha-formfield";
import "../components/ha-language-picker";
import "../components/ha-radio";
import type { HaRadio } from "../components/ha-radio";
import "../components/ha-textfield";
import type { HaTextField } from "../components/ha-textfield";
import "../components/ha-timezone-picker";
import "../components/map/ha-locations-editor";
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

  @state() private _elevation?: string;

  @state() private _unitSystem?: ConfigUpdateValues["unit_system"];

  @state() private _currency?: ConfigUpdateValues["currency"];

  @state() private _timeZone?: ConfigUpdateValues["time_zone"];

  @state() private _language: ConfigUpdateValues["language"];

  @state() private _country?: ConfigUpdateValues["country"];

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
      ${
        this._error
          ? html`<ha-alert alert-type="error">${this._error}</ha-alert>`
          : nothing
      }

      <p>
      ${this.onboardingLocalize(
        "ui.panel.page-onboarding.core-config.intro_core_config"
      )}
      </p>

      <div class="row">
        <ha-country-picker
          class="flex"
          .language=${this.hass.locale.language}
          .label=${
            this.hass.localize(
              "ui.panel.config.core.section.core.core_config.country"
            ) || "Country"
          }
            name="country"
            required
            .disabled=${this._working}
            .value=${this._countryValue}
            @value-changed=${this._handleValueChanged}
        >
        </ha-country-picker>
        <ha-language-picker
          class="flex"
          .hass=${this.hass}
          nativeName
          .label=${this.hass.localize(
            "ui.panel.config.core.section.core.core_config.language"
          )}
          name="language"
          required
          .value=${this._languageValue}
          .disabled=${this._working}
          @value-changed=${this._handleValueChanged}
        >
        </ha-language-picker>
      </div>

      <div class="row">
      <ha-timezone-picker
      class="flex"

                .label=${this.hass.localize(
                  "ui.panel.config.core.section.core.core_config.time_zone"
                )}
                name="timeZone"
                .disabled=${this._working}
                .value=${this._timeZoneValue}
                @value-changed=${this._handleValueChanged}
              >
              </ha-timezone-picker>

        <ha-textfield
          class="flex"
          .label=${this.hass.localize(
            "ui.panel.config.core.section.core.core_config.elevation"
          )}
          name="elevation"
          type="number"
          .disabled=${this._working}
          .value=${this._elevationValue}
          .suffix=${this.hass.localize(
            "ui.panel.config.core.section.core.core_config.elevation_meters"
          )}
          @change=${this._handleChange}
        >
        </ha-textfield>
      </div>

      <div class="row">
        <div class="flex">
          ${this.hass.localize(
            "ui.panel.config.core.section.core.core_config.unit_system"
          )}
        </div>
        <div class="radio-group">
          <ha-formfield
            .label=${html`${this.hass.localize(
                "ui.panel.config.core.section.core.core_config.unit_system_metric"
              )}
              <div class="secondary">
                ${this.hass.localize(
                  "ui.panel.config.core.section.core.core_config.metric_example"
                )}
              </div>`}
          >
            <ha-radio
              name="unit_system"
              value="metric"
              .checked=${this._unitSystemValue === "metric"}
              @change=${this._unitSystemChanged}
              .disabled=${this._working}
            ></ha-radio>
          </ha-formfield>
          <ha-formfield
            .label=${html`${this.hass.localize(
                "ui.panel.config.core.section.core.core_config.unit_system_us_customary"
              )}
              <div class="secondary">
                ${this.hass.localize(
                  "ui.panel.config.core.section.core.core_config.us_customary_example"
                )}
              </div>`}
          >
            <ha-radio
              name="unit_system"
              value="us_customary"
              .checked=${this._unitSystemValue === "us_customary"}
              @change=${this._unitSystemChanged}
              .disabled=${this._working}
            ></ha-radio>
          </ha-formfield>
        </div>
      </div>

      <div class="row">
            <div class="flex">
              ${this.hass.localize(
                "ui.panel.config.core.section.core.core_config.currency"
              )}<br />
              <a
                href="https://en.wikipedia.org/wiki/ISO_4217#Active_codes"
                target="_blank"
                rel="noopener noreferrer"
                >${this.hass.localize(
                  "ui.panel.config.core.section.core.core_config.find_currency_value"
                )}</a
              >
            </div>
            <ha-currency-picker
            class="flex"
                  .label=${this.hass.localize(
                    "ui.panel.config.core.section.core.core_config.currency"
                  )}
                  name="currency"
                  .disabled=${this._working}
                  .value=${this._currencyValue}
                  @value-changed=${this._handleValueChanged}
                >
</ha-currency-picker
                >
          </div>
        </div>

      <div class="footer">
        <mwc-button @click=${this._save} .disabled=${this._working}>
          ${this.onboardingLocalize(
            "ui.panel.page-onboarding.core-config.finish"
          )}
        </mwc-button>
      </div>
    `;
  }

  protected willUpdate(changedProps: PropertyValues): void {
    if (!changedProps.has("_country") || !this._country) {
      return;
    }
    if (!this._currency) {
      this._currency = countryCurrency[this._country];
    }
    if (!this._unitSystem) {
      this._unitSystem = ["US", "MM", "LR"].includes(this._country)
        ? "us_customary"
        : "metric";
    }
  }

  protected firstUpdated(changedProps: PropertyValues) {
    super.firstUpdated(changedProps);
    this.addEventListener("keyup", (ev) => {
      if (this._location && ev.key === "Enter") {
        this._save(ev);
      }
    });
  }

  private get _elevationValue() {
    return this._elevation !== undefined ? this._elevation : 0;
  }

  private get _timeZoneValue() {
    return this._timeZone || "";
  }

  private get _languageValue() {
    return this._language || "";
  }

  private get _countryValue() {
    return this._country || "";
  }

  private get _unitSystemValue() {
    return this._unitSystem !== undefined ? this._unitSystem : "metric";
  }

  private get _currencyValue() {
    return this._currency !== undefined ? this._currency : "";
  }

  private _handleValueChanged(ev: ValueChangedEvent<string>) {
    const target = ev.currentTarget as HTMLElement;
    this[`_${target.getAttribute("name")}`] = ev.detail.value;
  }

  private _handleChange(ev: Event) {
    const target = ev.currentTarget as HaTextField;
    this[`_${target.name}`] = target.value;
  }

  private async _locationChanged(ev) {
    this._location = ev.detail.value.location;
    this._country = ev.detail.value.country;
    this._elevation = ev.detail.value.elevation;
    this._currency = ev.detail.value.currency;
    this._language = ev.detail.value.language || getLocalLanguage();
    this._timeZone =
      ev.detail.value.timezone ||
      Intl.DateTimeFormat?.().resolvedOptions?.().timeZone;
    this._unitSystem = ev.detail.value.unit_system;
    if (this._country) {
      this._skipCore = true;
      this._save(ev);
      return;
    }
    await this.updateComplete;
    setTimeout(
      () => this.renderRoot.querySelector("ha-textfield")!.focus(),
      100
    );
  }

  private _unitSystemChanged(ev: CustomEvent) {
    this._unitSystem = (ev.target as HaRadio).value as
      | "metric"
      | "us_customary";
  }

  private async _save(ev) {
    if (!this._location) {
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
        elevation: Number(this._elevationValue),
        unit_system: this._unitSystemValue,
        time_zone: this._timeZoneValue || "UTC",
        currency: this._currencyValue || "EUR",
        country: this._countryValue,
        language: this._languageValue,
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
