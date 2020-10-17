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
import { fireEvent } from "../common/dom/fire_event";
import type { LocalizeFunc } from "../common/translations/localize";
import "../components/map/ha-location-editor";
import { createTimezoneListEl } from "../components/timezone-datalist";
import {
  ConfigUpdateValues,
  detectCoreConfig,
  saveCoreConfig,
} from "../data/core";
import { onboardCoreConfigStep } from "../data/onboarding";
import type { PolymerChangedEvent } from "../polymer-types";
import type { HomeAssistant } from "../types";

const amsterdam = [52.3731339, 4.8903147];
const mql = matchMedia("(prefers-color-scheme: dark)");

@customElement("onboarding-core-config")
class OnboardingCoreConfig extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property() public onboardingLocalize!: LocalizeFunc;

  @internalProperty() private _working = false;

  @internalProperty() private _name!: ConfigUpdateValues["location_name"];

  @internalProperty() private _location!: [number, number];

  @internalProperty() private _elevation!: string;

  @internalProperty() private _unitSystem!: ConfigUpdateValues["unit_system"];

  @internalProperty() private _timeZone!: string;

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
        <ha-location-editor
          class="flex"
          .hass=${this.hass}
          .location=${this._locationValue}
          .fitZoom=${14}
          .darkMode=${mql.matches}
          @change=${this._locationChanged}
        ></ha-location-editor>
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
        <paper-radio-group
          class="flex"
          .selected=${this._unitSystemValue}
          @selected-changed=${this._unitSystemChanged}
        >
          <paper-radio-button name="metric" .disabled=${this._working}>
            ${this.hass.localize(
              "ui.panel.config.core.section.core.core_config.unit_system_metric"
            )}
            <div class="secondary">
              ${this.hass.localize(
                "ui.panel.config.core.section.core.core_config.metric_example"
              )}
            </div>
          </paper-radio-button>
          <paper-radio-button name="imperial" .disabled=${this._working}>
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
    const input = this.shadowRoot!.querySelector(
      "[name=timeZone]"
    ) as PaperInputElement;
    input.inputElement.appendChild(createTimezoneListEl());
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

  private async _detect() {
    this._working = true;
    try {
      const values = await detectCoreConfig(this.hass);
      if (values.latitude && values.longitude) {
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
    } catch (err) {
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
      });
      const result = await onboardCoreConfigStep(this.hass);
      fireEvent(this, "onboarding-step", {
        type: "core_config",
        result,
      });
    } catch (err) {
      this._working = false;
      alert(`Failed to save: ${err.message}`);
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

      .middle-text {
        margin: 24px 0;
      }

      .row > * {
        margin: 0 8px;
      }
      .footer {
        margin-top: 16px;
        text-align: right;
      }
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "onboarding-core-config": OnboardingCoreConfig;
  }
}
