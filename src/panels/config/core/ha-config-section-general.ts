import type { TemplateResult } from "lit";
import { css, html, LitElement, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import { UNIT_C } from "../../../common/const";
import { stopPropagation } from "../../../common/dom/stop_propagation";
import { navigate } from "../../../common/navigate";
import "../../../components/buttons/ha-progress-button";
import type { HaProgressButton } from "../../../components/buttons/ha-progress-button";
import "../../../components/ha-alert";
import "../../../components/ha-card";
import "../../../components/ha-button";
import "../../../components/ha-checkbox";
import type { HaCheckbox } from "../../../components/ha-checkbox";
import "../../../components/ha-country-picker";
import "../../../components/ha-currency-picker";
import "../../../components/ha-formfield";
import "../../../components/ha-language-picker";
import "../../../components/ha-radio";
import type { HaRadio } from "../../../components/ha-radio";
import "../../../components/ha-textfield";
import type { HaTextField } from "../../../components/ha-textfield";
import "../../../components/ha-timezone-picker";
import type { ConfigUpdateValues } from "../../../data/core";
import { saveCoreConfig } from "../../../data/core";
import { showConfirmationDialog } from "../../../dialogs/generic/show-dialog-box";
import "../../../layouts/hass-subpage";
import "../../../components/map/ha-map";
import { haStyle } from "../../../resources/styles";
import type { HomeAssistant, ValueChangedEvent } from "../../../types";

@customElement("ha-config-section-general")
class HaConfigSectionGeneral extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ type: Boolean }) public narrow = false;

  @state() private _submittingName = false;

  @state() private _submittingRegional = false;

  @state() private _unitSystem?: ConfigUpdateValues["unit_system"];

  @state() private _currency?: string;

  @state() private _language?: string;

  @state() private _country?: string | null;

  @state() private _name?: string;

  @state() private _elevation?: number;

  @state() private _timeZone?: string;

  @state() private _location?: [number, number];

  @state() private _error?: string;

  @state() private _updateUnits?: boolean;

  protected render(): TemplateResult {
    const canEdit = ["storage", "default"].includes(
      this.hass.config.config_source
    );
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
          ${!canEdit
            ? html`
                <ha-alert>
                  ${this.hass.localize(
                    "ui.panel.config.core.section.core.core_config.edit_requires_storage"
                  )}
                </ha-alert>
              `
            : nothing}
          ${this._renderHomeNameCard(canEdit)}
          ${this._renderLocationCard(canEdit)}
          ${this._renderRegionalSettingsCard(canEdit)}
        </div>
      </hass-subpage>
    `;
  }

  private _renderHomeNameCard(canEdit: boolean): TemplateResult {
    const disabled = this._submittingName || !canEdit;

    return html`
      <ha-card
        outlined
        .header=${this.hass.localize(
          "ui.panel.config.core.section.core.home_name_card.header"
        )}
      >
        <div class="card-content">
          <ha-textfield
            name="name"
            .label=${this.hass.localize(
              "ui.panel.config.core.section.core.core_config.location_name"
            )}
            .disabled=${disabled}
            .value=${this._name}
            @change=${this._handleChange}
          ></ha-textfield>
        </div>
        <div class="card-actions">
          <ha-progress-button
            appearance="filled"
            @click=${this._updateHomeName}
            .disabled=${disabled}
          >
            ${this.hass.localize("ui.common.save")}
          </ha-progress-button>
        </div>
      </ha-card>
    `;
  }

  private _renderLocationCard(canEdit: boolean): TemplateResult {
    const hasHomeZone = "zone.home" in this.hass.states;

    return html`
      <ha-card
        outlined
        .header=${this.hass.localize(
          "ui.panel.config.core.section.core.location_card.header"
        )}
      >
        ${hasHomeZone
          ? html`
              <div class="card-content">
                <ha-map
                  .hass=${this.hass}
                  .entities=${["zone.home"]}
                  .zoom=${14}
                  .autoFit=${true}
                  .fitZones=${true}
                  .themeMode=${"auto"}
                  .renderPassive=${false}
                  .interactiveZones=${false}
                  class="map-preview"
                ></ha-map>
              </div>
            `
          : nothing}
        <div class="card-actions">
          <ha-button
            appearance="filled"
            @click=${this._editLocation}
            .disabled=${!canEdit}
          >
            ${this.hass.localize("ui.common.edit")}
          </ha-button>
        </div>
      </ha-card>
    `;
  }

  private _renderRegionalSettingsCard(canEdit: boolean): TemplateResult {
    const disabled = this._submittingRegional || !canEdit;

    return html`
      <ha-card
        outlined
        .header=${this.hass.localize(
          "ui.panel.config.core.section.core.regional_settings_card.header"
        )}
      >
        <div class="card-content">
          <ha-timezone-picker
            .hass=${this.hass}
            .label=${this.hass.localize(
              "ui.panel.config.core.section.core.core_config.time_zone"
            )}
            name="timeZone"
            .disabled=${disabled}
            .value=${this._timeZone}
            @value-changed=${this._handleValueChanged}
            hide-clear-icon
          ></ha-timezone-picker>
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
                .disabled=${disabled}
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
                .disabled=${disabled}
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
                      .disabled=${this._submittingRegional}
                      @change=${this._updateUnitsChanged}
                    ></ha-checkbox>
                  </ha-formfield>
                  <div class="secondary">
                    ${this.hass.localize(
                      "ui.panel.config.core.section.core.core_config.update_units_text_1"
                    )}
                    ${this.hass.localize(
                      "ui.panel.config.core.section.core.core_config.update_units_text_2"
                    )}
                    <br /><br />
                    ${this.hass.localize(
                      "ui.panel.config.core.section.core.core_config.update_units_text_3"
                    )}
                  </div>
                `
              : ""}
          </div>
          <div>
            <ha-currency-picker
              .hass=${this.hass}
              .label=${this.hass.localize(
                "ui.panel.config.core.section.core.core_config.currency"
              )}
              name="currency"
              .disabled=${disabled}
              .value=${this._currency}
              @value-changed=${this._handleValueChanged}
            ></ha-currency-picker>
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
          <ha-country-picker
            .hass=${this.hass}
            .label=${this.hass.localize(
              "ui.panel.config.core.section.core.core_config.country"
            )}
            name="country"
            .disabled=${disabled}
            .value=${this._country}
            @value-changed=${this._handleValueChanged}
          ></ha-country-picker>
          <ha-language-picker
            .hass=${this.hass}
            native-name
            .label=${this.hass.localize(
              "ui.panel.config.core.section.core.core_config.language"
            )}
            name="language"
            .value=${this._language}
            .disabled=${disabled}
            @closed=${stopPropagation}
            @value-changed=${this._handleValueChanged}
          >
          </ha-language-picker>
        </div>
        <div class="card-actions">
          <ha-progress-button
            appearance="filled"
            @click=${this._updateRegionalSettings}
            .disabled=${disabled}
          >
            ${this.hass.localize("ui.common.save")}
          </ha-progress-button>
        </div>
      </ha-card>
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
  }

  private _handleValueChanged(ev: ValueChangedEvent<string>) {
    const target = ev.currentTarget as HTMLElement;
    this[`_${target.getAttribute("name")}`] = ev.detail.value;
  }

  private _handleChange(ev: Event) {
    const target = ev.currentTarget as HaTextField;
    this[`_${target.name}`] = target.value;
  }

  private _unitSystemChanged(ev: CustomEvent) {
    this._unitSystem = (ev.target as HaRadio).value as
      | "metric"
      | "us_customary";
  }

  private _updateUnitsChanged(ev: CustomEvent) {
    this._updateUnits = (ev.target as HaCheckbox).checked;
  }

  private async _updateHomeName(ev: CustomEvent) {
    const button = ev.target as HaProgressButton;
    if (button.progress) {
      return;
    }

    button.progress = true;
    this._submittingName = true;
    this._error = undefined;

    try {
      await saveCoreConfig(this.hass, {
        location_name: this._name,
      });
      button.actionSuccess();
    } catch (err: any) {
      button.actionError();
      this._error = err.message;
    } finally {
      button.progress = false;
      this._submittingName = false;
    }
  }

  private async _updateRegionalSettings(ev: CustomEvent) {
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
    this._submittingRegional = true;
    this._error = undefined;

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
        time_zone: this._timeZone,
        elevation: Number(this._elevation),
        unit_system: this._unitSystem,
        update_units: this._updateUnits && unitSystemChanged,
        currency: this._currency,
        country: this._country,
        language: this._language,
        ...locationConfig,
      });
      button.actionSuccess();
    } catch (err: any) {
      button.actionError();
      this._error = err.message;
    } finally {
      button.progress = false;
      this._submittingRegional = false;
    }
  }

  private _editLocation() {
    navigate("/config/zone/edit/zone.home");
  }

  static styles = [
    haStyle,
    css`
      .content {
        padding: var(--ha-space-7) var(--ha-space-5) 0;
        max-width: 1040px;
        margin: 0 auto;
      }
      ha-card {
        max-width: 600px;
        margin: 0 auto var(--ha-space-6);
      }
      .card-content {
        display: flex;
        flex-direction: column;
      }
      .card-content > * {
        display: block;
      }
      .card-content > *:not(:first-child) {
        margin-top: var(--ha-space-4);
      }
      .card-actions {
        display: flex;
        justify-content: flex-end;
      }
      a.find-value {
        margin-top: var(--ha-space-2);
        display: inline-block;
      }
      .map-preview {
        height: 200px;
        width: 100%;
        display: block;
        border-radius: var(--ha-card-border-radius, 8px);
        overflow: hidden;
      }
    `,
  ];
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-config-section-general": HaConfigSectionGeneral;
  }
}
