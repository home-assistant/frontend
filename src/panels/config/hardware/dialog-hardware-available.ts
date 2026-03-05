import { dump } from "js-yaml";
import type { CSSResultGroup } from "lit";
import { css, html, LitElement, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import memoizeOne from "memoize-one";
import { fireEvent } from "../../../common/dom/fire_event";
import { stringCompare } from "../../../common/string/compare";
import "../../../components/ha-expansion-panel";
import "../../../components/ha-icon-next";
import "../../../components/ha-wa-dialog";
import "../../../components/search-input";
import { extractApiErrorMessage } from "../../../data/hassio/common";
import type { HassioHardwareInfo } from "../../../data/hassio/hardware";
import { fetchHassioHardwareInfo } from "../../../data/hassio/hardware";
import { showAlertDialog } from "../../../dialogs/generic/show-dialog-box";
import type { HassDialog } from "../../../dialogs/make-dialog-manager";
import { haStyleScrollbar } from "../../../resources/styles";
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

  @state() private _open = false;

  public async showDialog(): Promise<Promise<void>> {
    try {
      this._hardware = await fetchHassioHardwareInfo(this.hass);
      this._open = true;
    } catch (err: any) {
      await showAlertDialog(this, {
        title: this.hass.localize(
          "ui.panel.config.hardware.available_hardware.failed_to_get"
        ),
        text: extractApiErrorMessage(err),
      });
    }
  }

  public closeDialog(): boolean {
    this._open = false;
    return true;
  }

  private _dialogClosed() {
    this._open = false;
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
      <ha-wa-dialog
        .hass=${this.hass}
        .open=${this._open}
        flexcontent
        header-title=${this.hass.localize(
          "ui.panel.config.hardware.available_hardware.title"
        )}
        @closed=${this._dialogClosed}
      >
        <div class="content-container">
          <search-input
            autofocus
            .hass=${this.hass}
            .filter=${this._filter}
            @value-changed=${this._handleSearchChange}
            .label=${this.hass.localize(
              "ui.panel.config.hardware.available_hardware.search"
            )}
          >
          </search-input>
          <div class="devices-container ha-scrollbar">
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
                    : nothing}
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
          </div>
        </div>
      </ha-wa-dialog>
    `;
  }

  private _handleSearchChange(ev: CustomEvent) {
    this._filter = ev.detail.value;
  }

  static get styles(): CSSResultGroup {
    return [
      haStyleScrollbar,
      css`
        ha-wa-dialog {
          --dialog-content-padding: 0;
        }
        .content-container {
          display: flex;
          flex-direction: column;
          flex: 1;
          min-height: 0;
          overflow: hidden;
        }
        .devices-container {
          padding: var(--ha-space-6);
          overflow-y: auto;
          flex: 1;
          min-height: 0;
        }
        ha-expansion-panel {
          flex: 1;
          margin: 4px 0;
        }
        pre,
        code {
          background-color: var(--markdown-code-background-color, none);
          border-radius: var(--ha-border-radius-sm);
        }
        pre {
          padding: 16px;
          overflow: auto;
          line-height: var(--ha-line-height-normal);
          font-family: var(--ha-font-family-code);
        }
        code {
          font-size: var(--ha-font-size-s);
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
