import "@material/mwc-button/mwc-button";
import "@polymer/paper-input/paper-input";
import type { PaperInputElement } from "@polymer/paper-input/paper-input";
import "@polymer/paper-radio-button/paper-radio-button";
import "@polymer/paper-radio-group/paper-radio-group";
import {
  css,
  CSSResult,
  customElement,
  html,
  internalProperty,
  LitElement,
  property,
  TemplateResult,
} from "lit-element";
import { UNIT_C } from "../../../common/const";
import "../../../components/ha-card";
import "../../../components/map/ha-location-editor";
import { createTimezoneListEl } from "../../../components/timezone-datalist";
import { ConfigUpdateValues, saveCoreConfig } from "../../../data/core";
import type { PolymerChangedEvent } from "../../../polymer-types";
import type { HomeAssistant } from "../../../types";

@customElement("ha-config-core-form")
class ConfigCoreForm extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @internalProperty() private _working = false;

  @internalProperty() private _location!: [number, number];

  @internalProperty() private _elevation!: string;

  @internalProperty() private _unitSystem!: ConfigUpdateValues["unit_system"];

  @internalProperty() private _timeZone!: string;

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
            <ha-location-editor
              class="flex"
              .hass=${this.hass}
              .location=${this._locationValue}
              @change=${this._locationChanged}
            ></ha-location-editor>
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
    const input = this.shadowRoot!.querySelector(
      "[name=timeZone]"
    ) as PaperInputElement;
    input.inputElement.appendChild(createTimezoneListEl());
  }

  private get _locationValue() {
    return this._location !== undefined
      ? this._location
      : [Number(this.hass.config.latitude), Number(this.hass.config.longitude)];
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
    this[`_${target.name}`] = target.value;
  }

  private _locationChanged(ev) {
    this._location = ev.currentTarget.location;
  }

  private _unitSystemChanged(
    ev: PolymerChangedEvent<ConfigUpdateValues["unit_system"]>
  ) {
    this._unitSystem = ev.detail.value;
  }

  private async _save() {
    this._working = true;
    try {
      const location = this._locationValue;
      await saveCoreConfig(this.hass, {
        latitude: location[0],
        longitude: location[1],
        elevation: Number(this._elevationValue),
        unit_system: this._unitSystemValue,
        time_zone: this._timeZoneValue,
      });
    } catch (err) {
      alert("FAIL");
    } finally {
      this._working = false;
    }
  }

  static get styles(): CSSResult {
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
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-config-core-form": ConfigCoreForm;
  }
}
