import "@material/mwc-button/mwc-button";
import "@polymer/paper-dropdown-menu/paper-dropdown-menu";
import "@polymer/paper-input/paper-input";
import "@polymer/paper-item/paper-item";
import "@polymer/paper-listbox/paper-listbox";
import "../../components/ha-dialog";
import "../../components/ha-area-picker";

import {
  CSSResult,
  LitElement,
  TemplateResult,
  css,
  customElement,
  html,
  internalProperty,
  property,
} from "lit-element";

import { DeviceRegistryDetailDialogParams } from "./show-dialog-device-registry-detail";
import { HomeAssistant } from "../../types";
import { PolymerChangedEvent } from "../../polymer-types";
import { computeDeviceName } from "../../data/device_registry";
import { fireEvent } from "../../common/dom/fire_event";
import { haStyleDialog } from "../../resources/styles";

@customElement("dialog-device-registry-detail")
class DialogDeviceRegistryDetail extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @internalProperty() private _nameByUser!: string;

  @internalProperty() private _error?: string;

  @internalProperty() private _params?: DeviceRegistryDetailDialogParams;

  @internalProperty() private _areaId?: string;

  @internalProperty() private _submitting?: boolean;

  public async showDialog(
    params: DeviceRegistryDetailDialogParams
  ): Promise<void> {
    this._params = params;
    this._error = undefined;
    this._nameByUser = this._params.device.name_by_user || "";
    this._areaId = this._params.device.area_id;
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

  private async _updateEntry(): Promise<void> {
    this._submitting = true;
    try {
      await this._params!.updateEntry({
        name_by_user: this._nameByUser.trim() || null,
        area_id: this._areaId || null,
      });
      this._params = undefined;
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
      `,
    ];
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "dialog-device-registry-detail": DialogDeviceRegistryDetail;
  }
}
