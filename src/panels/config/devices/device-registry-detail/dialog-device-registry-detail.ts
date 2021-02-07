import "@material/mwc-button/mwc-button";
import "@polymer/paper-dropdown-menu/paper-dropdown-menu";
import "@polymer/paper-input/paper-input";
import "@polymer/paper-item/paper-item";
import "@polymer/paper-listbox/paper-listbox";
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
import { fireEvent } from "../../../../common/dom/fire_event";
import "../../../../components/ha-area-picker";
import "../../../../components/ha-dialog";
import type { HaSwitch } from "../../../../components/ha-switch";
import { computeDeviceName } from "../../../../data/device_registry";
import { PolymerChangedEvent } from "../../../../polymer-types";
import { haStyle, haStyleDialog } from "../../../../resources/styles";
import { HomeAssistant } from "../../../../types";
import { DeviceRegistryDetailDialogParams } from "./show-dialog-device-registry-detail";

@customElement("dialog-device-registry-detail")
class DialogDeviceRegistryDetail extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @internalProperty() private _nameByUser!: string;

  @internalProperty() private _error?: string;

  @internalProperty() private _params?: DeviceRegistryDetailDialogParams;

  @internalProperty() private _areaId?: string;

  @internalProperty() private _disabledBy!: string | null;

  @internalProperty() private _submitting?: boolean;

  public async showDialog(
    params: DeviceRegistryDetailDialogParams
  ): Promise<void> {
    this._params = params;
    this._error = undefined;
    this._nameByUser = this._params.device.name_by_user || "";
    this._areaId = this._params.device.area_id;
    this._disabledBy = this._params.device.disabled_by;
    await this.updateComplete;
  }

  public closeDialog(): void {
    this._error = "";
    this._params = undefined;
    fireEvent(this, "dialog-closed", { dialog: this.localName });
  }

  protected render(): TemplateResult {
    if (!this._params) {
      return html``;
    }
    const device = this._params.device;
    return html`
      <ha-dialog
        open
        @closed=${this.closeDialog}
        .heading=${computeDeviceName(device, this.hass)}
      >
        <div>
          ${this._error ? html` <div class="error">${this._error}</div> ` : ""}
          <div class="form">
            <paper-input
              .value=${this._nameByUser}
              @value-changed=${this._nameChanged}
              .label=${this.hass.localize("ui.panel.config.devices.name")}
              .placeholder=${device.name || ""}
              .disabled=${this._submitting}
            ></paper-input>
            <ha-area-picker
              .hass=${this.hass}
              .value=${this._areaId}
              @value-changed=${this._areaPicked}
            ></ha-area-picker>
            <div class="row">
              <ha-switch
                .checked=${!this._disabledBy}
                @change=${this._disabledByChanged}
              >
              </ha-switch>
              <div>
                <div>
                  ${this.hass.localize("ui.panel.config.devices.enabled_label")}
                </div>
                <div class="secondary">
                  ${this._disabledBy && this._disabledBy !== "user"
                    ? this.hass.localize(
                        "ui.panel.config.devices.enabled_cause",
                        "cause",
                        this.hass.localize(
                          `config_entry.disabled_by.${this._disabledBy}`
                        )
                      )
                    : ""}
                  ${this.hass.localize(
                    "ui.panel.config.devices.enabled_description"
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
        <mwc-button
          slot="secondaryAction"
          @click=${this.closeDialog}
          .disabled=${this._submitting}
        >
          ${this.hass.localize("ui.common.cancel")}
        </mwc-button>
        <mwc-button
          slot="primaryAction"
          @click="${this._updateEntry}"
          .disabled=${this._submitting}
        >
          ${this.hass.localize("ui.panel.config.devices.update")}
        </mwc-button>
      </ha-dialog>
    `;
  }

  private _nameChanged(ev: PolymerChangedEvent<string>): void {
    this._error = undefined;
    this._nameByUser = ev.detail.value;
  }

  private _areaPicked(event: CustomEvent): void {
    this._areaId = event.detail.value;
  }

  private _disabledByChanged(ev: Event): void {
    this._disabledBy = (ev.target as HaSwitch).checked ? null : "user";
  }

  private async _updateEntry(): Promise<void> {
    this._submitting = true;
    try {
      await this._params!.updateEntry({
        name_by_user: this._nameByUser.trim() || null,
        area_id: this._areaId || null,
        disabled_by: this._disabledBy || null,
      });
      this.closeDialog();
    } catch (err) {
      this._error =
        err.message ||
        this.hass.localize("ui.panel.config.devices.unknown_error");
    } finally {
      this._submitting = false;
    }
  }

  static get styles(): CSSResult[] {
    return [
      haStyle,
      haStyleDialog,
      css`
        .form {
          padding-bottom: 24px;
        }
        mwc-button.warning {
          margin-right: auto;
        }
        .error {
          color: var(--error-color);
        }
        ha-switch {
          margin-right: 16px;
        }
        .row {
          margin-top: 8px;
          color: var(--primary-text-color);
          display: flex;
          align-items: center;
        }
      `,
    ];
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "dialog-device-registry-detail": DialogDeviceRegistryDetail;
  }
}
