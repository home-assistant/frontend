import { mdiClose } from "@mdi/js";
import { dump } from "js-yaml";
import { css, CSSResultGroup, html, LitElement, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import memoizeOne from "memoize-one";
import { fireEvent } from "../../../common/dom/fire_event";
import { stringCompare } from "../../../common/string/compare";
import "../../../components/ha-dialog";
import "../../../components/ha-expansion-panel";
import "../../../components/ha-icon-next";
import "../../../components/search-input";
import { extractApiErrorMessage } from "../../../data/hassio/common";
import {
  fetchHassioHardwareInfo,
  HassioHardwareInfo,
} from "../../../data/hassio/hardware";
import { showAlertDialog } from "../../../dialogs/generic/show-dialog-box";
import type { HassDialog } from "../../../dialogs/make-dialog-manager";
import { haStyle, haStyleDialog } from "../../../resources/styles";
import type { HomeAssistant } from "../../../types";

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

@customElement("ha-dialog-hardware-available")
class DialogHardwareAvailable extends LitElement implements HassDialog {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @state() private _hardware?: HassioHardwareInfo;

  @state() private _filter?: string;

  public async showDialog(): Promise<Promise<void>> {
    try {
      this._hardware = await fetchHassioHardwareInfo(this.hass);
    } catch (err: any) {
      await showAlertDialog(this, {
        title: this.hass.localize(
          "ui.panel.config.hardware.available_hardware.failed_to_get"
        ),
        text: extractApiErrorMessage(err),
      });
    }
  }

  public closeDialog(): void {
    this._hardware = undefined;
    fireEvent(this, "dialog-closed", { dialog: this.localName });
  }

  protected render() {
    if (!this._hardware) {
      return nothing;
    }

    const devices = _filterDevices(
      this.hass.userData?.showAdvanced || false,
      this._hardware,
      (this._filter || "").toLowerCase(),
      this.hass.locale.language
    );

    return html`
      <ha-dialog
        open
        hideActions
        @closed=${this.closeDialog}
        .heading=${this.hass.localize(
          "ui.panel.config.hardware.available_hardware.title"
        )}
      >
        <div class="header" slot="heading">
          <h2>
            ${this.hass.localize(
              "ui.panel.config.hardware.available_hardware.title"
            )}
          </h2>
          <ha-icon-button
            .label=${this.hass.localize("ui.common.close")}
            .path=${mdiClose}
            dialogAction="close"
          ></ha-icon-button>
          <search-input
            .hass=${this.hass}
            .filter=${this._filter}
            @value-changed=${this._handleSearchChange}
            .label=${this.hass.localize(
              "ui.panel.config.hardware.available_hardware.search"
            )}
          >
          </search-input>
        </div>
        ${devices.map(
          (device) => html`
            <ha-expansion-panel
              .header=${device.name}
              .secondary=${device.by_id || undefined}
              outlined
            >
              <div class="device-property">
                <span>
                  ${this.hass.localize(
                    "ui.panel.config.hardware.available_hardware.subsystem"
                  )}:
                </span>
                <span>${device.subsystem}</span>
              </div>
              <div class="device-property">
                <span>
                  ${this.hass.localize(
                    "ui.panel.config.hardware.available_hardware.device_path"
                  )}:
                </span>
                <code>${device.dev_path}</code>
              </div>
              ${device.by_id
                ? html`
                    <div class="device-property">
                      <span>
                        ${this.hass.localize(
                          "ui.panel.config.hardware.available_hardware.id"
                        )}:
                      </span>
                      <code>${device.by_id}</code>
                    </div>
                  `
                : ""}
              <div class="attributes">
                <span>
                  ${this.hass.localize(
                    "ui.panel.config.hardware.available_hardware.attributes"
                  )}:
                </span>
                <pre>${dump(device.attributes, { indent: 2 })}</pre>
              </div>
            </ha-expansion-panel>
          `
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
    "ha-dialog-hardware-available": DialogHardwareAvailable;
  }
}
