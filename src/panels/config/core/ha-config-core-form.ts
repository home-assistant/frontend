import "@material/mwc-button/mwc-button";
import "@polymer/paper-input/paper-input";
import type { PaperInputElement } from "@polymer/paper-input/paper-input";
import "@polymer/paper-radio-button/paper-radio-button";
import "@polymer/paper-radio-group/paper-radio-group";
import { css, CSSResultGroup, html, LitElement, TemplateResult } from "lit";
import { customElement, property, state } from "lit/decorators";
import memoizeOne from "memoize-one";
import { UNIT_C } from "../../../common/const";
import { createCurrencyListEl } from "../../../components/currency-datalist";
import "../../../components/ha-card";
import "../../../components/map/ha-locations-editor";
import type { MarkerLocation } from "../../../components/map/ha-locations-editor";
import { createTimezoneListEl } from "../../../components/timezone-datalist";
import { ConfigUpdateValues, saveCoreConfig } from "../../../data/core";
import { SYMBOL_TO_ISO } from "../../../data/currency";
import type { PolymerChangedEvent } from "../../../polymer-types";
import type { HomeAssistant } from "../../../types";

@customElement("ha-config-core-form")
class ConfigCoreForm extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @state() private _working = false;

  @state() private _location?: [number, number];

  @state() private _currency?: string;

  @state() private _elevation?: string;

  @state() private _unitSystem?: ConfigUpdateValues["unit_system"];

  @state() private _timeZone?: string;

  protected render(): TemplateResult {
    const canEdit = ["storage", "default"].includes(
      this.hass.config.config_source
    );
    const disabled = this._working || !canEdit;

    return html`
      <ha-card
        .header=${this.hass.localize(
          "ui.panel.config.core.section.core.form.heading"
        )}
      >
        <div class="card-content">
          ${!canEdit
            ? html`
                <p>
                  ${this.hass.localize(
                    "ui.panel.config.core.section.core.core_config.edit_requires_storage"
                  )}
                </p>
              `
            : ""}

          <div class="row">
            <ha-locations-editor
              class="flex"
              .hass=${this.hass}
              .locations=${this._markerLocation(
                this.hass.config.latitude,
                this.hass.config.longitude,
                this._location
              )}
              @location-updated=${this._locationChanged}
            ></ha-locations-editor>
          </div>

          <div class="row">
            <div class="flex">
              ${this.hass.localize(
                "ui.panel.config.core.section.core.core_config.time_zone"
              )}
            </div>

            <paper-input
              class="flex"
              .label=${this.hass.localize(
                "ui.panel.config.core.section.core.core_config.time_zone"
              )}
              name="timeZone"
              list="timezones"
              .disabled=${disabled}
              .value=${this._timeZoneValue}
              @value-changed=${this._handleChange}
            ></paper-input>
          </div>
          <div class="row">
            <div class="flex">
              ${this.hass.localize(
                "ui.panel.config.core.section.core.core_config.elevation"
              )}
            </div>

            <paper-input
              class="flex"
              .label=${this.hass.localize(
                "ui.panel.config.core.section.core.core_config.elevation"
              )}
              name="elevation"
              type="number"
              .disabled=${disabled}
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
            <paper-radio-group
              class="flex"
              .selected=${this._unitSystemValue}
              @selected-changed=${this._unitSystemChanged}
            >
              <paper-radio-button name="metric" .disabled=${disabled}>
                ${this.hass.localize(
                  "ui.panel.config.core.section.core.core_config.unit_system_metric"
                )}
                <div class="secondary">
                  ${this.hass.localize(
                    "ui.panel.config.core.section.core.core_config.metric_example"
                  )}
                </div>
              </paper-radio-button>
              <paper-radio-button name="imperial" .disabled=${disabled}>
                ${this.hass.localize(
                  "ui.panel.config.core.section.core.core_config.unit_system_imperial"
                )}
                <div class="secondary">
                  ${this.hass.localize(
                    "ui.panel.config.core.section.core.core_config.imperial_example"
                  )}
                </div>
              </paper-radio-button>
            </paper-radio-group>
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
              .disabled=${disabled}
              .value=${this._currencyValue}
              @value-changed=${this._handleChange}
            ></paper-input>
          </div>
        </div>
        <div class="card-actions">
          <mwc-button @click=${this._save} .disabled=${disabled}>
            ${this.hass.localize(
              "ui.panel.config.core.section.core.core_config.save_button"
            )}
          </mwc-button>
        </div>
      </ha-card>
    `;
  }

  protected firstUpdated(changedProps) {
    super.firstUpdated(changedProps);

    const tzInput = this.shadowRoot!.querySelector(
      "[name=timeZone]"
    ) as PaperInputElement;
    tzInput.inputElement.appendChild(createTimezoneListEl());

    const cInput = this.shadowRoot!.querySelector(
      "[name=currency]"
    ) as PaperInputElement;
    cInput.inputElement.appendChild(createCurrencyListEl());
  }

  private _markerLocation = memoizeOne(
    (
      lat: number,
      lng: number,
      location?: [number, number]
    ): MarkerLocation[] => [
      {
        id: "location",
        latitude: location ? location[0] : lat,
        longitude: location ? location[1] : lng,
        location_editable: true,
      },
    ]
  );

  private get _currencyValue() {
    return this._currency !== undefined
      ? this._currency
      : this.hass.config.currency;
  }

  private get _elevationValue() {
    return this._elevation !== undefined
      ? this._elevation
      : this.hass.config.elevation;
  }

  private get _timeZoneValue() {
    return this._timeZone !== undefined
      ? this._timeZone
      : this.hass.config.time_zone;
  }

  private get _unitSystemValue() {
    return this._unitSystem !== undefined
      ? this._unitSystem
      : this.hass.config.unit_system.temperature === UNIT_C
      ? "metric"
      : "imperial";
  }

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

  private _unitSystemChanged(
    ev: PolymerChangedEvent<ConfigUpdateValues["unit_system"]>
  ) {
    this._unitSystem = ev.detail.value;
  }

  private async _save() {
    this._working = true;
    try {
      const location = this._location || [
        this.hass.config.latitude,
        this.hass.config.longitude,
      ];
      await saveCoreConfig(this.hass, {
        latitude: location[0],
        longitude: location[1],
        currency: this._currencyValue,
        elevation: Number(this._elevationValue),
        unit_system: this._unitSystemValue,
        time_zone: this._timeZoneValue,
      });
    } catch (err) {
      alert(`Error saving config: ${err.message}`);
    } finally {
      this._working = false;
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

      .flex {
        flex: 1;
      }

      .row > * {
        margin: 0 8px;
      }

      .card-actions {
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
    "ha-config-core-form": ConfigCoreForm;
  }
}
