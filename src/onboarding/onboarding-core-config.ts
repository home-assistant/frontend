import "@material/mwc-button/mwc-button";
import "@polymer/paper-input/paper-input";
import type { PaperInputElement } from "@polymer/paper-input/paper-input";
import { css, CSSResultGroup, html, LitElement, TemplateResult } from "lit";
import { customElement, property, query, state } from "lit/decorators";
import memoizeOne from "memoize-one";
import { fireEvent } from "../common/dom/fire_event";
import type { LocalizeFunc } from "../common/translations/localize";
import { createCurrencyListEl } from "../components/currency-datalist";
import "../components/map/ha-locations-editor";
import type {
  HaLocationsEditor,
  MarkerLocation,
} from "../components/map/ha-locations-editor";
import { createTimezoneListEl } from "../components/timezone-datalist";
import {
  ConfigUpdateValues,
  detectCoreConfig,
  saveCoreConfig,
} from "../data/core";
import { SYMBOL_TO_ISO } from "../data/currency";
import { onboardCoreConfigStep } from "../data/onboarding";
import type { PolymerChangedEvent } from "../polymer-types";
import type { HomeAssistant } from "../types";
import "../components/ha-radio";
import "../components/ha-formfield";
import type { HaRadio } from "../components/ha-radio";

const amsterdam: [number, number] = [52.3731339, 4.8903147];
const mql = matchMedia("(prefers-color-scheme: dark)");
const locationMarkerId = "location";

@customElement("onboarding-core-config")
class OnboardingCoreConfig extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property() public onboardingLocalize!: LocalizeFunc;

  @state() private _working = false;

  @state() private _name?: ConfigUpdateValues["location_name"];

  @state() private _location?: [number, number];

  @state() private _elevation?: string;

  @state() private _unitSystem?: ConfigUpdateValues["unit_system"];

  @state() private _currency?: ConfigUpdateValues["currency"];

  @state() private _timeZone?: string;

  @query("ha-locations-editor", true) private map!: HaLocationsEditor;

  protected render(): TemplateResult {
    return html`
      <p>
        ${this.onboardingLocalize(
          "ui.panel.page-onboarding.core-config.intro",
          "name",
          this.hass.user!.name
        )}
      </p>

      <paper-input
        .label=${this.onboardingLocalize(
          "ui.panel.page-onboarding.core-config.location_name"
        )}
        name="name"
        .disabled=${this._working}
        .value=${this._nameValue}
        @value-changed=${this._handleChange}
      ></paper-input>

      <div class="middle-text">
        <p>
          ${this.onboardingLocalize(
            "ui.panel.page-onboarding.core-config.intro_location"
          )}
        </p>

        <div class="row">
          <div>
            ${this.onboardingLocalize(
              "ui.panel.page-onboarding.core-config.intro_location_detect"
            )}
          </div>
          <mwc-button @click=${this._detect}>
            ${this.onboardingLocalize(
              "ui.panel.page-onboarding.core-config.button_detect"
            )}
          </mwc-button>
        </div>
      </div>

      <div class="row">
        <ha-locations-editor
          class="flex"
          .hass=${this.hass}
          .locations=${this._markerLocation(this._locationValue)}
          zoom="14"
          .darkMode=${mql.matches}
          @location-updated=${this._locationChanged}
        ></ha-locations-editor>
      </div>

      <div class="row">
        <paper-input
          class="flex"
          .label=${this.hass.localize(
            "ui.panel.config.core.section.core.core_config.time_zone"
          )}
          name="timeZone"
          list="timezones"
          .disabled=${this._working}
          .value=${this._timeZoneValue}
          @value-changed=${this._handleChange}
        ></paper-input>

        <paper-input
          class="flex"
          .label=${this.hass.localize(
            "ui.panel.config.core.section.core.core_config.elevation"
          )}
          name="elevation"
          type="number"
          .disabled=${this._working}
          .value=${this._elevationValue}
          @value-changed=${this._handleChange}
        >
          <span slot="suffix">
            ${this.hass.localize(
              "ui.panel.config.core.section.core.core_config.elevation_meters"
            )}
          </span>
        </paper-input>
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
                "ui.panel.config.core.section.core.core_config.unit_system_imperial"
              )}
              <div class="secondary">
                ${this.hass.localize(
                  "ui.panel.config.core.section.core.core_config.imperial_example"
                )}
              </div>`}
          >
            <ha-radio
              name="unit_system"
              value="imperial"
              .checked=${this._unitSystemValue === "imperial"}
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

            <paper-input
              class="flex"
              .label=${this.hass.localize(
                "ui.panel.config.core.section.core.core_config.currency"
              )}
              name="currency"
              list="currencies"
              .disabled=${this._working}
              .value=${this._currencyValue}
              @value-changed=${this._handleChange}
            ></paper-input>
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

  protected firstUpdated(changedProps) {
    super.firstUpdated(changedProps);
    setTimeout(
      () => this.shadowRoot!.querySelector("paper-input")!.focus(),
      100
    );
    this.addEventListener("keypress", (ev) => {
      if (ev.keyCode === 13) {
        this._save(ev);
      }
    });
    const tzInput = this.shadowRoot!.querySelector(
      "[name=timeZone]"
    ) as PaperInputElement;
    tzInput.inputElement.appendChild(createTimezoneListEl());

    const cInput = this.shadowRoot!.querySelector(
      "[name=currency]"
    ) as PaperInputElement;
    cInput.inputElement.appendChild(createCurrencyListEl());
  }

  private get _nameValue() {
    return this._name !== undefined
      ? this._name
      : this.onboardingLocalize(
          "ui.panel.page-onboarding.core-config.location_name_default"
        );
  }

  private get _locationValue() {
    return this._location || amsterdam;
  }

  private get _elevationValue() {
    return this._elevation !== undefined ? this._elevation : 0;
  }

  private get _timeZoneValue() {
    return this._timeZone;
  }

  private get _unitSystemValue() {
    return this._unitSystem !== undefined ? this._unitSystem : "metric";
  }

  private get _currencyValue() {
    return this._currency !== undefined ? this._currency : "";
  }

  private _markerLocation = memoizeOne(
    (location: [number, number]): MarkerLocation[] => [
      {
        id: locationMarkerId,
        latitude: location[0],
        longitude: location[1],
        location_editable: true,
      },
    ]
  );

  private _handleChange(ev: PolymerChangedEvent<string>) {
    const target = ev.currentTarget as PaperInputElement;

    let value = target.value;

    if (target.name === "currency" && value) {
      if (value in SYMBOL_TO_ISO) {
        value = SYMBOL_TO_ISO[value];
      }
    }

    this[`_${target.name}`] = value;
  }

  private _locationChanged(ev) {
    this._location = ev.detail.location;
  }

  private _unitSystemChanged(ev: CustomEvent) {
    this._unitSystem = (ev.target as HaRadio).value as "metric" | "imperial";
  }

  private async _detect() {
    this._working = true;
    try {
      const values = await detectCoreConfig(this.hass);

      if (values.latitude && values.longitude) {
        this.map.addEventListener(
          "markers-updated",
          () => {
            this.map.fitMarker(locationMarkerId);
          },
          {
            once: true,
          }
        );
        this._location = [Number(values.latitude), Number(values.longitude)];
      }
      if (values.elevation) {
        this._elevation = String(values.elevation);
      }
      if (values.unit_system) {
        this._unitSystem = values.unit_system;
      }
      if (values.time_zone) {
        this._timeZone = values.time_zone;
      }
      if (values.currency) {
        this._currency = values.currency;
      }
    } catch (err: any) {
      alert(`Failed to detect location information: ${err.message}`);
    } finally {
      this._working = false;
    }
  }

  private async _save(ev) {
    ev.preventDefault();
    this._working = true;
    try {
      const location = this._locationValue;
      await saveCoreConfig(this.hass, {
        location_name: this._nameValue,
        latitude: location[0],
        longitude: location[1],
        elevation: Number(this._elevationValue),
        unit_system: this._unitSystemValue,
        time_zone: this._timeZoneValue || "UTC",
        currency: this._currencyValue || "EUR",
      });
      const result = await onboardCoreConfigStep(this.hass);
      fireEvent(this, "onboarding-step", {
        type: "core_config",
        result,
      });
    } catch (err: any) {
      this._working = false;
      alert(`Failed to save: ${err.message}`);
    }
  }

  static get styles(): CSSResultGroup {
    return css`
      .row {
        display: flex;
        flex-direction: row;
        margin: 0 -8px;
        align-items: center;
      }

      .secondary {
        color: var(--secondary-text-color);
      }

      ha-locations-editor {
        height: 200px;
      }

      .flex {
        flex: 1;
      }

      .middle-text {
        margin: 24px 0;
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
