import type { CSSResultGroup } from "lit";
import { css, html, LitElement, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import { fireEvent } from "../../../../common/dom/fire_event";
import { computeDeviceNameDisplay } from "../../../../common/entity/compute_device_name";
import "../../../../components/ha-alert";
import "../../../../components/ha-area-picker";
import "../../../../components/ha-button";
import "../../../../components/ha-dialog-footer";
import "../../../../components/ha-wa-dialog";
import "../../../../components/ha-labels-picker";
import type { HaSwitch } from "../../../../components/ha-switch";
import "../../../../components/ha-textfield";
import type { DeviceRegistryEntry } from "../../../../data/device_registry";
import { haStyle, haStyleDialog } from "../../../../resources/styles";
import type { HomeAssistant } from "../../../../types";
import type { DeviceRegistryDetailDialogParams } from "./show-dialog-device-registry-detail";

@customElement("dialog-device-registry-detail")
class DialogDeviceRegistryDetail extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @state() private _nameByUser!: string;

  @state() private _error?: string;

  @state() private _params?: DeviceRegistryDetailDialogParams;

  @state() private _areaId!: string;

  @state() private _labels!: string[];

  @state() private _disabledBy!: DeviceRegistryEntry["disabled_by"];

  @state() private _submitting = false;

  public async showDialog(
    params: DeviceRegistryDetailDialogParams
  ): Promise<void> {
    this._params = params;
    this._error = undefined;
    this._nameByUser = this._params.device.name_by_user || "";
    this._areaId = this._params.device.area_id || "";
    this._labels = this._params.device.labels || [];
    this._disabledBy = this._params.device.disabled_by;
    await this.updateComplete;
  }

  public closeDialog(): void {
    this._error = "";
    this._params = undefined;
    fireEvent(this, "dialog-closed", { dialog: this.localName });
  }

  protected render() {
    if (!this._params) {
      return nothing;
    }
    const device = this._params.device;
    return html`
      <ha-wa-dialog
        open
        @closed=${this.closeDialog}
        .headerTitle=${computeDeviceNameDisplay(device, this.hass)}
      >
        <div>
          ${this._error
            ? html`<ha-alert alert-type="error">${this._error}</ha-alert> `
            : ""}
          <div class="form">
            <ha-textfield
              .value=${this._nameByUser}
              @input=${this._nameChanged}
              .label=${this.hass.localize(
                "ui.dialogs.device-registry-detail.name"
              )}
              .placeholder=${device.name || ""}
              .disabled=${this._submitting}
              dialogInitialFocus
            ></ha-textfield>
            <ha-area-picker
              .hass=${this.hass}
              .value=${this._areaId}
              @value-changed=${this._areaPicked}
            ></ha-area-picker>
            <ha-labels-picker
              .hass=${this.hass}
              .value=${this._labels}
              @value-changed=${this._labelsChanged}
            ></ha-labels-picker>
            <div class="row">
              <ha-switch
                .checked=${!this._disabledBy}
                .disabled=${this._params.device.disabled_by === "config_entry"}
                @change=${this._disabledByChanged}
              >
              </ha-switch>
              <div>
                <div>
                  ${this.hass.localize(
                    "ui.dialogs.device-registry-detail.enabled_label",
                    {
                      type: this.hass.localize(
                        `ui.dialogs.device-registry-detail.type.${
                          device.entry_type || "device"
                        }`
                      ),
                    }
                  )}
                </div>
                <div class="secondary">
                  ${this._disabledBy && this._disabledBy !== "user"
                    ? this.hass.localize(
                        "ui.dialogs.device-registry-detail.enabled_cause",
                        {
                          type: this.hass.localize(
                            `ui.dialogs.device-registry-detail.type.${
                              device.entry_type || "device"
                            }`
                          ),
                          cause: this.hass.localize(
                            `config_entry.disabled_by.${this._disabledBy}`
                          ),
                        }
                      )
                    : ""}
                  ${this.hass.localize(
                    "ui.dialogs.device-registry-detail.enabled_description"
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
        <ha-dialog-footer slot="footer">
          <ha-button
            slot="secondaryAction"
            appearance="plain"
            data-dialog="close"
            .disabled=${this._submitting}
          >
            ${this.hass.localize("ui.common.cancel")}
          </ha-button>
          <ha-button
            slot="primaryAction"
            .disabled=${this._submitting}
            @click=${this._updateEntry}
          >
            ${this.hass.localize("ui.dialogs.device-registry-detail.update")}
          </ha-button>
        </ha-dialog-footer>
      </ha-wa-dialog>
    `;
  }

  private _nameChanged(ev): void {
    this._error = undefined;
    this._nameByUser = ev.target.value;
  }

  private _areaPicked(event: CustomEvent): void {
    this._areaId = event.detail.value;
  }

  private _labelsChanged(event: CustomEvent): void {
    this._labels = event.detail.value;
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
        labels: this._labels || null,
        disabled_by: this._disabledBy || null,
      });
      this.closeDialog();
    } catch (err: any) {
      this._error =
        err.message ||
        this.hass.localize("ui.dialogs.device-registry-detail.unknown_error");
    } finally {
      this._submitting = false;
    }
  }

  static get styles(): CSSResultGroup {
    return [
      haStyle,
      haStyleDialog,
      css`
        ha-button.warning {
          margin-right: auto;
          margin-inline-end: auto;
          margin-inline-start: initial;
        }
        ha-textfield,
        ha-labels-picker,
        ha-area-picker {
          display: block;
          margin-bottom: 16px;
        }
        ha-switch {
          margin-right: 16px;
          margin-inline-end: 16px;
          margin-inline-start: initial;
          direction: var(--direction);
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
