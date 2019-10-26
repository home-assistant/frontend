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

import { DeviceRegistryDetailDialogParams } from "./show-dialog-device-registry-detail";
import { PolymerChangedEvent } from "../../polymer-types";
import { haStyleDialog } from "../../resources/styles";
import { HomeAssistant } from "../../types";
import {
  subscribeAreaRegistry,
  AreaRegistryEntry,
} from "../../data/area_registry";

@customElement("dialog-device-registry-detail")
class DialogDeviceRegistryDetail extends LitElement {
  @property() public hass!: HomeAssistant;

  @property() private _nameByUser!: string;
  @property() private _error?: string;
  @property() private _params?: DeviceRegistryDetailDialogParams;
  @property() private _areas?: AreaRegistryEntry[];
  @property() private _areaId?: string;

  private _submitting?: boolean;
  private _unsubAreas?: any;

  public async showDialog(
    params: DeviceRegistryDetailDialogParams
  ): Promise<void> {
    this._params = params;
    this._error = undefined;
    this._nameByUser = this._params.device.name_by_user || "";
    this._areaId = this._params.device.area_id;
    await this.updateComplete;
  }

  public connectedCallback() {
    super.connectedCallback();
    this._unsubAreas = subscribeAreaRegistry(this.hass.connection, (areas) => {
      this._areas = areas;
    });
  }

  public disconnectedCallback() {
    super.disconnectedCallback();
    if (this._unsubAreas) {
      this._unsubAreas();
    }
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
          ${device.name ||
            this.hass.localize("ui.panel.config.devices.unnamed_device")}
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
              .label=${this.hass.localize("ui.dialogs.more_info_settings.name")}
              .placeholder=${device.name || ""}
              .disabled=${this._submitting}
            ></paper-input>
            <div class="area">
              <paper-dropdown-menu
                label="${this.hass.localize(
                  "ui.panel.config.integrations.config_entry.area_picker_label"
                )}"
                class="flex"
              >
                <paper-listbox
                  slot="dropdown-content"
                  .selected="${this._computeSelectedArea()}"
                  @iron-select="${this._areaIndexChanged}"
                >
                  <paper-item>
                    ${this.hass.localize(
                      "ui.panel.config.integrations.config_entry.no_area"
                    )}
                  </paper-item>
                  ${this._renderAreas()}
                </paper-listbox>
              </paper-dropdown-menu>
            </div>
          </div>
        </paper-dialog-scrollable>
        <div class="paper-dialog-buttons">
          <mwc-button @click="${this._updateEntry}">
            ${this.hass.localize(
              "ui.panel.config.entity_registry.editor.update"
            )}
          </mwc-button>
        </div>
      </ha-paper-dialog>
    `;
  }

  private _nameChanged(ev: PolymerChangedEvent<string>): void {
    this._error = undefined;
    this._nameByUser = ev.detail.value;
  }

  private _renderAreas() {
    if (!this._areas) {
      return;
    }
    return this._areas!.map(
      (area) => html`
        <paper-item>${area.name}</paper-item>
      `
    );
  }

  private _computeSelectedArea() {
    if (!this._params || !this._areas) {
      return -1;
    }
    const device = this._params!.device;
    if (!device.area_id) {
      return 0;
    }
    // +1 because of "No Area" entry
    return this._areas.findIndex((area) => area.area_id === device.area_id) + 1;
  }

  private _areaIndexChanged(event): void {
    const selectedAreaIdx = event.target!.selected;
    this._areaId =
      selectedAreaIdx < 1
        ? undefined
        : this._areas![selectedAreaIdx - 1].area_id;
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
        this.hass.localize(
          "ui.panel.config.entity_registry.editor.unknown_error"
        );
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
