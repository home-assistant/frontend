import "@material/mwc-button";
import "@material/mwc-list/mwc-list";
import "@material/mwc-list/mwc-list-item";
import timezones from "google-timezones-json";
import { css, CSSResultGroup, html, LitElement, TemplateResult } from "lit";
import { customElement, property, state } from "lit/decorators";
import { UNIT_C } from "../../../common/const";
import { fireEvent } from "../../../common/dom/fire_event";
import { stopPropagation } from "../../../common/dom/stop_propagation";
import { currencies } from "../../../components/currency-datalist";
import { createCloseHeading } from "../../../components/ha-dialog";
import { HaRadio } from "../../../components/ha-radio";
import "../../../components/ha-select";
import { ConfigUpdateValues, saveCoreConfig } from "../../../data/core";
import { SYMBOL_TO_ISO } from "../../../data/currency";
import { haStyleDialog } from "../../../resources/styles";
import type { HomeAssistant } from "../../../types";

@customElement("dialog-core-zone-detail")
class DialogZoneDetail extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @state() private _submitting = false;

  @state() private _open = false;

  @state() private _unitSystem?: ConfigUpdateValues["unit_system"];

  @state() private _currency?: string;

  @state() private _name?: string;

  @state() private _elevation?: number;

  @state() private _timeZone?: string;

  public showDialog(): void {
    this._submitting = false;
    this._unitSystem =
      this.hass.config.unit_system.temperature === UNIT_C
        ? "metric"
        : "imperial";
    this._currency = this.hass.config.currency;
    this._elevation = this.hass.config.elevation;
    this._timeZone = this.hass.config.time_zone;
    this._name = this.hass.config.location_name;
    this._open = true;
  }

  public closeDialog(): void {
    this._open = false;
    this._currency = undefined;
    this._elevation = undefined;
    this._timeZone = undefined;
    this._unitSystem = undefined;
    this._name = undefined;

    fireEvent(this, "dialog-closed", { dialog: this.localName });
  }

  protected render(): TemplateResult {
    const canEdit = ["storage", "default"].includes(
      this.hass.config.config_source
    );
    const disabled = this._submitting || !canEdit;

    if (!this._open) {
      return html``;
    }

    return html`
      <ha-dialog
        open
        @closed=${this.closeDialog}
        scrimClickAction
        escapeKeyAction
        .heading=${createCloseHeading(this.hass, "Core Zone Configuration")}
      >
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
              html`<mwc-list-item value=${tz}>${timezones[tz]}</mwc-list-item>`
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
          @change=${this._handleChange}
        >
          <span slot="suffix">
            ${this.hass.localize(
              "ui.panel.config.core.section.core.core_config.elevation_meters"
            )}
          </span>
        </ha-textfield>
        <div>
          <div>
            ${this.hass.localize(
              "ui.panel.config.core.section.core.core_config.unit_system"
            )}
          </div>
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
              .checked=${this._unitSystem === "metric"}
              @change=${this._unitSystemChanged}
              .disabled=${this._submitting}
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
              .checked=${this._unitSystem === "imperial"}
              @change=${this._unitSystemChanged}
              .disabled=${this._submitting}
            ></ha-radio>
          </ha-formfield>
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
            ${currencies.map(
              (currency) =>
                html`<mwc-list-item .value=${currency}
                  >${currency}</mwc-list-item
                >`
            )}</ha-select
          >
          <a
            href="https://en.wikipedia.org/wiki/ISO_4217#Active_codes"
            target="_blank"
            rel="noopener noreferrer"
            >${this.hass.localize(
              "ui.panel.config.core.section.core.core_config.find_currency_value"
            )}</a
          >
        </div>
        <mwc-button slot="primaryAction" @click=${this._updateEntry}>
          ${this.hass!.localize("ui.panel.config.zone.detail.update")}
        </mwc-button>
      </ha-dialog>
    `;
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
    this._unitSystem = (ev.target as HaRadio).value as "metric" | "imperial";
  }

  private async _updateEntry() {
    this._submitting = true;
    try {
      await saveCoreConfig(this.hass, {
        currency: this._currency,
        elevation: Number(this._elevation),
        unit_system: this._unitSystem,
        time_zone: this._timeZone,
        location_name: this._name,
      });
    } catch (err: any) {
      alert(`Error saving config: ${err.message}`);
    } finally {
      this._submitting = false;
    }

    this.closeDialog();
  }

  static get styles(): CSSResultGroup {
    return [
      haStyleDialog,
      css`
        ha-dialog {
          --mdc-dialog-min-width: 600px;
        }
        @media all and (max-width: 450px), all and (max-height: 500px) {
          ha-dialog {
            --mdc-dialog-min-width: calc(
              100vw - env(safe-area-inset-right) - env(safe-area-inset-left)
            );
          }
        }
        .card-actions {
          text-align: right;
        }
        ha-dialog > * {
          display: block;
          margin-top: 16px;
        }
        ha-select {
          display: block;
        }
      `,
    ];
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "dialog-core-zone-detail": DialogZoneDetail;
  }
}
