import {
  LitElement,
  html,
  css,
  CSSResult,
  TemplateResult,
  customElement,
  property,
} from "lit-element";
import "@polymer/paper-dialog-scrollable/paper-dialog-scrollable";
import "@polymer/paper-input/paper-input";
import "@polymer/paper-listbox/paper-listbox";
import "@polymer/paper-dropdown-menu/paper-dropdown-menu";
import "@polymer/paper-item/paper-item";
import "@material/mwc-button/mwc-button";

import "../../components/dialog/ha-paper-dialog";
import "../../components/ha-area-picker";

import { DeviceRegistryDetailDialogParams } from "./show-dialog-device-registry-detail";
import { PolymerChangedEvent } from "../../polymer-types";
import { haStyleDialog } from "../../resources/styles";
import { HomeAssistant } from "../../types";
import { computeDeviceName } from "../../data/device_registry";

@customElement("dialog-device-registry-detail")
class DialogDeviceRegistryDetail extends LitElement {
  @property() public hass!: HomeAssistant;

  @property() private _nameByUser!: string;
  @property() private _error?: string;
  @property() private _params?: DeviceRegistryDetailDialogParams;
  @property() private _areaId?: string;

  private _submitting?: boolean;

  public async showDialog(
    params: DeviceRegistryDetailDialogParams
  ): Promise<void> {
    this._params = params;
    this._error = undefined;
    this._nameByUser = this._params.device.name_by_user || "";
    this._areaId = this._params.device.area_id;
    await this.updateComplete;
  }

  protected render(): TemplateResult | void {
    if (!this._params) {
      return html``;
    }
    const device = this._params.device;

    return html`
      <ha-paper-dialog
        with-backdrop
        opened
        @opened-changed="${this._openedChanged}"
      >
        <h2>
          ${computeDeviceName(device, this.hass)}
        </h2>
        <paper-dialog-scrollable>
          ${this._error
            ? html`
                <div class="error">${this._error}</div>
              `
            : ""}
          <div class="form">
            <paper-input
              .value=${this._nameByUser}
              @value-changed=${this._nameChanged}
              .label=${this.hass.localize("ui.dialogs.devices.name")}
              .placeholder=${device.name || ""}
              .disabled=${this._submitting}
            ></paper-input>
            <ha-area-picker
              .hass=${this.hass}
              .value=${this._areaId}
              @value-changed=${this._areaPicked}
            ></ha-area-picker>
          </div>
        </paper-dialog-scrollable>
        <div class="paper-dialog-buttons">
          <mwc-button @click="${this._updateEntry}">
            ${this.hass.localize("ui.panel.config.devices.update")}
          </mwc-button>
        </div>
      </ha-paper-dialog>
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

  private _openedChanged(ev: PolymerChangedEvent<boolean>): void {
    if (!(ev.detail as any).value) {
      this._params = undefined;
    }
  }

  static get styles(): CSSResult[] {
    return [
      haStyleDialog,
      css`
        ha-paper-dialog {
          min-width: 400px;
        }
        .form {
          padding-bottom: 24px;
        }
        mwc-button.warning {
          margin-right: auto;
        }
        .error {
          color: var(--google-red-500);
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
