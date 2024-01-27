import { mdiClose } from "@mdi/js";
import { dump } from "js-yaml";
import { css, CSSResultGroup, html, LitElement, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import memoizeOne from "memoize-one";
import { fireEvent } from "../../../../src/common/dom/fire_event";
import { stringCompare } from "../../../../src/common/string/compare";
import "../../../../src/components/ha-dialog";
import "../../../../src/components/ha-expansion-panel";
import "../../../../src/components/ha-icon-button";
import "../../../../src/components/search-input";
import { HassioHardwareInfo } from "../../../../src/data/hassio/hardware";
import { haStyle, haStyleDialog } from "../../../../src/resources/styles";
import { HomeAssistant } from "../../../../src/types";
import { HassioHardwareDialogParams } from "./show-dialog-hassio-hardware";

const _filterDevices = memoizeOne(
  (
    showAdvanced: boolean,
    hardware: HassioHardwareInfo,
    filter: string,
    language: string
  ) =>
    hardware.devices
      .filter(
        (device) =>
          (showAdvanced ||
            ["tty", "gpio", "input"].includes(device.subsystem)) &&
          (device.by_id?.toLowerCase().includes(filter) ||
            device.name.toLowerCase().includes(filter) ||
            device.dev_path.toLocaleLowerCase().includes(filter) ||
            JSON.stringify(device.attributes)
              .toLocaleLowerCase()
              .includes(filter))
      )
      .sort((a, b) => stringCompare(a.name, b.name, language))
);

@customElement("dialog-hassio-hardware")
class HassioHardwareDialog extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @state() private _dialogParams?: HassioHardwareDialogParams;

  @state() private _filter?: string;

  public showDialog(dialogParams: HassioHardwareDialogParams) {
    this._dialogParams = dialogParams;
  }

  public closeDialog() {
    this._dialogParams = undefined;
    fireEvent(this, "dialog-closed", { dialog: this.localName });
  }

  protected render() {
    if (!this._dialogParams) {
      return nothing;
    }

    const devices = _filterDevices(
      this.hass.userData?.showAdvanced || false,
      this._dialogParams.hardware,
      (this._filter || "").toLowerCase(),
      this.hass.locale.language
    );

    return html`
      <ha-dialog
        open
        scrimClickAction
        hideActions
        @closed=${this.closeDialog}
        .heading=${this._dialogParams.supervisor.localize(
          "dialog.hardware.title"
        )}
      >
        <div class="header" slot="heading">
          <h2>
            ${this._dialogParams.supervisor.localize("dialog.hardware.title")}
          </h2>
          <ha-icon-button
            .label=${this._dialogParams.supervisor.localize("common.close")}
            .path=${mdiClose}
            dialogAction="close"
          ></ha-icon-button>
          <search-input
            .hass=${this.hass}
            .filter=${this._filter}
            @value-changed=${this._handleSearchChange}
            .label=${this._dialogParams.supervisor.localize(
              "dialog.hardware.search"
            )}
          >
          </search-input>
        </div>

        ${devices.map(
          (device) =>
            html`<ha-expansion-panel
              .header=${device.name}
              .secondary=${device.by_id || undefined}
              outlined
            >
              <div class="device-property">
                <span>
                  ${this._dialogParams!.supervisor.localize(
                    "dialog.hardware.subsystem"
                  )}:
                </span>
                <span>${device.subsystem}</span>
              </div>
              <div class="device-property">
                <span>
                  ${this._dialogParams!.supervisor.localize(
                    "dialog.hardware.device_path"
                  )}:
                </span>
                <code>${device.dev_path}</code>
              </div>
              ${device.by_id
                ? html` <div class="device-property">
                    <span>
                      ${this._dialogParams!.supervisor.localize(
                        "dialog.hardware.id"
                      )}:
                    </span>
                    <code>${device.by_id}</code>
                  </div>`
                : ""}
              <div class="attributes">
                <span>
                  ${this._dialogParams!.supervisor.localize(
                    "dialog.hardware.attributes"
                  )}:
                </span>
                <pre>${dump(device.attributes, { indent: 2 })}</pre>
              </div>
            </ha-expansion-panel>`
        )}
      </ha-dialog>
    `;
  }

  private _handleSearchChange(ev: CustomEvent) {
    this._filter = ev.detail.value;
  }

  static get styles(): CSSResultGroup {
    return [
      haStyle,
      haStyleDialog,
      css`
        ha-icon-button {
          position: absolute;
          right: 16px;
          top: 10px;
          text-decoration: none;
          color: var(--primary-text-color);
        }
        h2 {
          margin: 18px 42px 0 18px;
          color: var(--primary-text-color);
        }

        ha-expansion-panel {
          margin: 4px 0;
        }
        pre,
        code {
          background-color: var(--markdown-code-background-color, none);
          border-radius: 3px;
        }
        pre {
          padding: 16px;
          overflow: auto;
          line-height: 1.45;
          font-family: var(--code-font-family, monospace);
        }
        code {
          font-size: 85%;
          padding: 0.2em 0.4em;
        }
        search-input {
          margin: 8px 16px 0;
          display: block;
        }
        .device-property {
          display: flex;
          justify-content: space-between;
        }
        .attributes {
          margin-top: 12px;
        }
      `,
    ];
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "dialog-hassio-hardware": HassioHardwareDialog;
  }
}
