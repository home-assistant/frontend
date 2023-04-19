import "@material/mwc-list/mwc-list-item";
import timezones from "google-timezones-json";
import { css, html, LitElement, TemplateResult } from "lit";
import { customElement, property, state } from "lit/decorators";
import memoizeOne from "memoize-one";
import { UNIT_C } from "../../../common/const";
import { stopPropagation } from "../../../common/dom/stop_propagation";
import { navigate } from "../../../common/navigate";
import { caseInsensitiveStringCompare } from "../../../common/string/compare";
import "../../../components/buttons/ha-progress-button";
import type { HaProgressButton } from "../../../components/buttons/ha-progress-button";
import { getCountryOptions } from "../../../components/country-datalist";
import { getCurrencyOptions } from "../../../components/currency-datalist";
import "../../../components/ha-card";
import "../../../components/ha-formfield";
import "../../../components/ha-radio";
import type { HaRadio } from "../../../components/ha-radio";
import "../../../components/ha-select";
import "../../../components/ha-settings-row";
import "../../../components/ha-textfield";
import "../../../components/map/ha-locations-editor";
import type { MarkerLocation } from "../../../components/map/ha-locations-editor";
import { ConfigUpdateValues, saveCoreConfig } from "../../../data/core";
import { SYMBOL_TO_ISO } from "../../../data/currency";
import "../../../layouts/hass-subpage";
import { haStyle } from "../../../resources/styles";
import type { HomeAssistant } from "../../../types";
import "../../../components/ha-alert";
import { showConfirmationDialog } from "../../../dialogs/generic/show-dialog-box";
import type { HaCheckbox } from "../../../components/ha-checkbox";
import "../../../components/ha-checkbox";

@customElement("ha-config-section-general")
class HaConfigSectionGeneral extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ type: Boolean }) public narrow!: boolean;

  @state() private _submitting = false;

  @state() private _unitSystem?: ConfigUpdateValues["unit_system"];

  @state() private _currency?: string;

  @state() private _language?: string;

  @state() private _country?: string | null;

  @state() private _name?: string;

  @state() private _elevation?: number;

  @state() private _timeZone?: string;

  @state() private _location?: [number, number];

  @state() private _languages?: { value: string; label: string }[];

  @state() private _error?: string;

  @state() private _updateUnits?: boolean;

  protected render(): TemplateResult {
    const canEdit = ["storage", "default"].includes(
      this.hass.config.config_source
    );
    const disabled = this._submitting || !canEdit;
    return html`
      <hass-subpage
        back-path="/config/system"
        .hass=${this.hass}
        .narrow=${this.narrow}
        .header=${this.hass.localize("ui.panel.config.core.caption")}
      >
        <div class="content">
          ${this._error
            ? html`<ha-alert alert-type="error">${this._error}</ha-alert>`
            : ""}
          <ha-card outlined>
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
              <ha-textfield
                name="name"
                .label=${this.hass.localize(
                  "ui.panel.config.core.section.core.core_config.location_name"
                )}
                .disabled=${disabled}
                .value=${this._name}
                @change=${this._handleChange}
              ></ha-textfield>
              <ha-select
                .label=${this.hass.localize(
                  "ui.panel.config.core.section.core.core_config.time_zone"
                )}
                name="timeZone"
                fixedMenuPosition
                naturalMenuWidth
                .disabled=${disabled}
                .value=${this._timeZone}
                @closed=${stopPropagation}
                @change=${this._handleChange}
              >
                ${Object.keys(timezones).map(
                  (tz) =>
                    html`<mwc-list-item value=${tz}
                      >${timezones[tz]}</mwc-list-item
                    >`
                )}
              </ha-select>
              <ha-textfield
                .label=${this.hass.localize(
                  "ui.panel.config.core.section.core.core_config.elevation"
                )}
                name="elevation"
                type="number"
                .disabled=${disabled}
                .value=${this._elevation}
                .suffix=${this.hass.localize(
                  "ui.panel.config.core.section.core.core_config.elevation_meters"
                )}
                @change=${this._handleChange}
              >
              </ha-textfield>
              <div>
                <div>
                  ${this.hass.localize(
                    "ui.panel.config.core.section.core.core_config.unit_system"
                  )}
                </div>
                <ha-formfield
                  .label=${html`
                    <span style="font-size: 14px">
                      ${this.hass.localize(
                        "ui.panel.config.core.section.core.core_config.metric_example"
                      )}
                    </span>
                    <div style="color: var(--secondary-text-color)">
                      ${this.hass.localize(
                        "ui.panel.config.core.section.core.core_config.unit_system_metric"
                      )}
                    </div>
                  `}
                >
                  <ha-radio
                    name="unit_system"
                    value="metric"
                    .checked=${this._unitSystem === "metric"}
                    @change=${this._unitSystemChanged}
                    .disabled=${this._submitting}
                  ></ha-radio>
                </ha-formfield>
                <ha-formfield
                  .label=${html`
                    <span style="font-size: 14px">
                      ${this.hass.localize(
                        "ui.panel.config.core.section.core.core_config.us_customary_example"
                      )}
                    </span>
                    <div style="color: var(--secondary-text-color)">
                      ${this.hass.localize(
                        "ui.panel.config.core.section.core.core_config.unit_system_us_customary"
                      )}
                    </div>
                  `}
                >
                  <ha-radio
                    name="unit_system"
                    value="us_customary"
                    .checked=${this._unitSystem === "us_customary"}
                    @change=${this._unitSystemChanged}
                    .disabled=${this._submitting}
                  ></ha-radio>
                </ha-formfield>
                ${this._unitSystem !== this._configuredUnitSystem()
                  ? html`
                      <ha-formfield
                        .label=${this.hass.localize(
                          "ui.panel.config.core.section.core.core_config.update_units_label"
                        )}
                      >
                        <ha-checkbox
                          .checked=${this._updateUnits}
                          .disabled=${this._submitting}
                          @change=${this._updateUnitsChanged}
                        ></ha-checkbox>
                      </ha-formfield>
                      <div class="secondary">
                        ${this.hass.localize(
                          "ui.panel.config.core.section.core.core_config.update_units_text_1"
                        )}
                        ${this.hass.localize(
                          "ui.panel.config.core.section.core.core_config.update_units_text_2"
                        )} <br /><br />
                        ${this.hass.localize(
                          "ui.panel.config.core.section.core.core_config.update_units_text_3"
                        )}
                      </div>
                    `
                  : ""}
              </div>
              <div>
                <ha-select
                  .label=${this.hass.localize(
                    "ui.panel.config.core.section.core.core_config.currency"
                  )}
                  name="currency"
                  fixedMenuPosition
                  naturalMenuWidth
                  .disabled=${disabled}
                  .value=${this._currency}
                  @closed=${stopPropagation}
                  @change=${this._handleChange}
                >
                  ${getCurrencyOptions(this.hass.locale.language).map(
                    ({ value, label }) =>
                      html`<mwc-list-item .value=${value}>
                        ${label}
                      </mwc-list-item>`
                  )}</ha-select
                >
                <a
                  href="https://en.wikipedia.org/wiki/ISO_4217#Active_codes"
                  target="_blank"
                  rel="noopener noreferrer"
                  class="find-value"
                  >${this.hass.localize(
                    "ui.panel.config.core.section.core.core_config.find_currency_value"
                  )}</a
                >
              </div>
              <ha-select
                .label=${this.hass.localize(
                  "ui.panel.config.core.section.core.core_config.country"
                )}
                name="country"
                fixedMenuPosition
                naturalMenuWidth
                .disabled=${disabled}
                .value=${this._country}
                @closed=${stopPropagation}
                @change=${this._handleChange}
              >
                ${getCountryOptions(this.hass.locale.language).map(
                  ({ value, label }) =>
                    html`<mwc-list-item .value=${value}>
                      ${label}
                    </mwc-list-item>`
                )}</ha-select
              >
              <ha-select
                .label=${this.hass.localize(
                  "ui.panel.config.core.section.core.core_config.language"
                )}
                name="language"
                fixedMenuPosition
                naturalMenuWidth
                .disabled=${disabled}
                .value=${this._language}
                @closed=${stopPropagation}
                @change=${this._handleChange}
              >
                ${this._languages?.map(
                  ({ value, label }) =>
                    html`<mwc-list-item .value=${value}
                      >${label}</mwc-list-item
                    >`
                )}</ha-select
              >
            </div>
            ${this.narrow
              ? html`
                  <ha-locations-editor
                    .hass=${this.hass}
                    .locations=${this._markerLocation(
                      this.hass.config.latitude,
                      this.hass.config.longitude,
                      this._location
                    )}
                    @location-updated=${this._locationChanged}
                  ></ha-locations-editor>
                `
              : html`
                  <ha-settings-row>
                    <div slot="heading">
                      ${this.hass.localize(
                        "ui.panel.config.core.section.core.core_config.edit_location"
                      )}
                    </div>
                    <div slot="description" class="secondary">
                      ${this.hass.localize(
                        "ui.panel.config.core.section.core.core_config.edit_location_description"
                      )}
                    </div>
                    <mwc-button @click=${this._editLocation}
                      >${this.hass.localize("ui.common.edit")}</mwc-button
                    >
                  </ha-settings-row>
                `}
            <div class="card-actions">
              <ha-progress-button @click=${this._updateEntry}>
                ${this.hass!.localize("ui.panel.config.zone.detail.update")}
              </ha-progress-button>
            </div>
          </ha-card>
        </div>
      </hass-subpage>
    `;
  }

  private _configuredUnitSystem() {
    return this.hass.config.unit_system.temperature === UNIT_C
      ? "metric"
      : "us_customary";
  }

  protected firstUpdated(): void {
    this._unitSystem = this._configuredUnitSystem();
    this._currency = this.hass.config.currency;
    this._country = this.hass.config.country;
    this._language = this.hass.config.language;
    this._elevation = this.hass.config.elevation;
    this._timeZone = this.hass.config.time_zone || "Etc/GMT";
    this._name = this.hass.config.location_name;
    this._updateUnits = true;
    this._computeLanguages();
  }

  private _computeLanguages() {
    if (!this.hass.translationMetadata?.translations) {
      return;
    }
    this._languages = Object.entries(this.hass.translationMetadata.translations)
      .sort((a, b) =>
        caseInsensitiveStringCompare(
          a[1].nativeName,
          b[1].nativeName,
          this.hass.locale.language
        )
      )
      .map(([value, metaData]) => ({
        value,
        label: metaData.nativeName,
      }));
  }

  private _handleChange(ev) {
    const target = ev.currentTarget;
    let value = target.value;

    if (target.name === "currency" && value) {
      if (value in SYMBOL_TO_ISO) {
        value = SYMBOL_TO_ISO[value];
      }
    }

    this[`_${target.name}`] = value;
  }

  private _unitSystemChanged(ev: CustomEvent) {
    this._unitSystem = (ev.target as HaRadio).value as
      | "metric"
      | "us_customary";
  }

  private _updateUnitsChanged(ev: CustomEvent) {
    this._updateUnits = (ev.target as HaCheckbox).checked;
  }

  private _locationChanged(ev: CustomEvent) {
    this._location = ev.detail.location;
  }

  private async _updateEntry(ev: CustomEvent) {
    const button = ev.target as HaProgressButton;
    if (button.progress) {
      return;
    }
    const unitSystemChanged = this._unitSystem !== this._configuredUnitSystem();
    if (unitSystemChanged && this._updateUnits) {
      if (
        !(await showConfirmationDialog(this, {
          title: this.hass.localize(
            "ui.panel.config.core.section.core.core_config.update_units_confirm_title"
          ),
          text: this.hass.localize(
            "ui.panel.config.core.section.core.core_config.update_units_confirm_text"
          ),
          confirmText: this.hass!.localize(
            "ui.panel.config.core.section.core.core_config.update_units_confirm_update"
          ),
          dismissText: this.hass!.localize("ui.common.cancel"),
        }))
      ) {
        return;
      }
    }
    button.progress = true;

    let locationConfig;

    if (this._location) {
      locationConfig = {
        latitude: this._location[0],
        longitude: this._location[1],
      };
    }

    this._error = undefined;

    try {
      await saveCoreConfig(this.hass, {
        currency: this._currency,
        elevation: Number(this._elevation),
        unit_system: this._unitSystem,
        update_units: this._updateUnits && unitSystemChanged,
        time_zone: this._timeZone,
        location_name: this._name,
        language: this._language,
        country: this._country,
        ...locationConfig,
      });
      button.actionSuccess();
    } catch (err: any) {
      button.actionError();
      this._error = err.message;
    } finally {
      button.progress = false;
    }
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

  private _editLocation() {
    navigate("/config/zone/edit/zone.home");
  }

  static styles = [
    haStyle,
    css`
      .content {
        padding: 28px 20px 0;
        max-width: 1040px;
        margin: 0 auto;
      }
      ha-card {
        max-width: 600px;
        margin: 0 auto;
        height: 100%;
        justify-content: space-between;
        flex-direction: column;
        display: flex;
      }
      .card-content {
        display: flex;
        justify-content: space-between;
        flex-direction: column;
        padding: 16px 16px 0 16px;
      }
      .card-actions {
        text-align: right;
        height: 48px;
        display: flex;
        justify-content: flex-end;
        align-items: center;
        margin-top: 16px;
      }
      .card-content > * {
        display: block;
        margin-top: 16px;
      }
      ha-select {
        display: block;
      }
      a.find-value {
        margin-top: 8px;
        display: inline-block;
      }
      ha-locations-editor {
        display: block;
        height: 400px;
        padding: 16px;
      }
    `,
  ];
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-config-section-general": HaConfigSectionGeneral;
  }
}
