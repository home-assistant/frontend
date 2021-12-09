import "../../../../../components/ha-attributes";
import { mdiFolderUpload } from "@mdi/js";

import "../../../../../components/ha-file-upload";
import "../../../../../components/ha-chip"; /* eslint-disable no-console */

import "@material/mwc-list/mwc-list-item";
import "@material/mwc-list/mwc-list";
import { Menu } from "@material/mwc-menu";
import "../../../../../components/ha-card";
import { customElement, property, state } from "lit/decorators";
import { css, CSSResultGroup, html, LitElement, TemplateResult } from "lit";
import "../../../../../components/ha-dialog";
import { classMap } from "lit/directives/class-map";
import { ifDefined } from "lit/directives/if-defined";
import { HomeAssistant } from "../../../../../types";
import { MyDevice } from "./mydevice";
import { int2semver, semver2int } from "./semver";
import { IMyFirmware, MyFirmware, MyFirmwareVersion } from "./myfirmware";
import { showAlertDialog } from "../../../../../dialogs/generic/show-dialog-box";
import { extractApiErrorMessage } from "../../../../../data/hassio/common";
import { haStyle, haStyleDialog } from "../../../../../resources/styles";

@customElement("mysensors-firmware-dialog")
class HaDialogFwMySensors extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ attribute: false }) public device: MyDevice = new MyDevice();

  @state() private _firmwares: MyFirmware[] = [];

  @state() private _selected_fw_version: Record<number, string | undefined> =
    {};

  @state() private _selected: { fw_type: number | false; fw_version: string } =
    { fw_type: false, fw_version: "" };

  @state() private _uploading = false;

  @state() private _filter = true;

  async firstUpdated(
    changedProperties: Map<string | number | symbol, unknown>
  ) {
    super.firstUpdated(changedProperties);
    this._refresh();
  }

  private async _refresh(): Promise<void> {
    return new Promise((resolve) => {
      Promise.all([this._refreshFirmwares()])
        .then(async () => {
          resolve();
        })
        .then(() => {
          // console.log("Updae Screen!");
          this.requestUpdate();
        })
        .then(() => {
          setTimeout(() => this._refresh(), 1000);
        });
    });
  }

  private async _refreshFirmwares(): Promise<MyFirmware[]> {
    if (!this.device) return Promise.resolve([]);
    return new Promise((resolve, reject) => {
      if (this.hass !== undefined) {
        this.hass.connection
          .sendMessagePromise<{ list: IMyFirmware[] }>({
            type: `mysensors/firmware_list`,
          })
          .then(
            (resp) => {
              this._firmwares = resp.list.reduce(
                (prev: MyFirmware[], tfw: IMyFirmware) => {
                  let fw = prev.find(
                    (afw) => afw.fw_type === Number(tfw.fw_type)
                  );
                  if (!fw) {
                    fw = new MyFirmware();
                    fw.fw_name = tfw.fw_name;
                    fw.fw_type = Number(tfw.fw_type);
                    prev.push(fw);
                  }
                  const fwv = fw.fw_versions.find(
                    (fwvv) => fwvv.fw_ver === Number(tfw.fw_ver)
                  );
                  if (!fwv)
                    fw.fw_versions.push({
                      bloader_ver: tfw.bloader_ver,
                      fw_blocks: tfw.fw_blocks,
                      fw_crc: tfw.fw_crc,
                      fw_ver: semver2int(tfw.fw_version || "0.0.0"),
                      fw_version: tfw.fw_version,
                      fw_filename: tfw.fw_filename,
                    } as MyFirmwareVersion);

                  return prev;
                },
                [] as MyFirmware[]
              );
            },
            (err) => {
              console.error("Unable to fetch Firmware list!", err);
              reject();
            }
          )
          .then(() => {
            this._firmwares.forEach((fw) => {
              if (fw.fw_type !== undefined && fw.fw_versions.length === 1) {
                this._selected_fw_version[fw.fw_type] =
                  fw.fw_versions[0].fw_version;
              }
              // else if (fw.fw_type !== undefined) {
              //  this._selected_fw_version[fw.fw_type] = undefined;
              // }
            });
            // console.log(this._firmwares, this._selected_fw_version);
          })
          .then(() => this.performUpdate())
          .then(() => resolve(this._firmwares));
      } else {
        alert("Unable to connect to Hass core!");
        reject();
      }
    });
  }

  private async _selectFirmware(
    firmware: MyFirmware,
    index: number
  ): Promise<void> {
    if (firmware.fw_type && this._selected.fw_type === firmware.fw_type) {
      this._selected = {
        fw_type: false,
        fw_version: "",
      };
      if (
        this._selected_fw_version[firmware.fw_type] &&
        firmware.fw_versions.length > 1
      ) {
        this._selected_fw_version[firmware.fw_type] = undefined;
      }
    } else if (
      firmware.fw_type &&
      this._selected_fw_version[firmware.fw_type]
    ) {
      this._selected = {
        fw_type: firmware.fw_type,
        fw_version: this._selected_fw_version[firmware.fw_type] || "",
      };
    } else {
      const menu = this.shadowRoot?.getElementById("fw_menu_" + index) as Menu;
      menu.show();
    }
  }

  private async _uploadFile(ev) {
    const file = ev.detail.files[0];

    /*
    if (!["application/hex"].includes(file.type)) {
      showAlertDialog(this, {
        title: `Unsupported file format ${file.type}`,
        text: "Please choose a valid MySensors firmware file (.hex)",
        confirmText: "ok",
      });
      return;
    }
    */
    this._uploading = true;
    try {
      console.log(file);
      const firmware = await this._uploadFirmware(this.hass, file);
      console.log(firmware);
    } catch (err: any) {
      showAlertDialog(this, {
        title: "Upload failed",
        text: extractApiErrorMessage(err),
        confirmText: "ok",
      });
    } finally {
      this._uploading = false;
    }
  }

  private async _uploadFirmware(
    hass: HomeAssistant,
    file: File
  ): Promise<unknown> {
    const fd = new FormData();
    fd.append("file", file);
    const resp = await hass.fetchWithAuth(`/api/mysensors/firmware/upload`, {
      method: "POST",
      body: fd,
    });

    if (resp.status === 413) {
      throw new Error("Uploaded backup is too large");
    } else if (resp.status !== 200) {
      throw new Error(`${resp.status} ${resp.statusText}`);
    }
    return resp;
  }

  private _getConfigEntryId(): string {
    const searchParams = new URLSearchParams(window.location.search);
    if (!searchParams.has("config_entry")) {
      return "";
    }
    return searchParams.get("config_entry") as string;
  }

  private async _confirm() {
    console.log("Confirm", this._selected);
    if (!this._selected.fw_type) return;
    const fwx = this._firmwares.find(
      (fw) => fw.fw_type === this._selected.fw_type
    );
    console.log("Firmware", fwx);
    if (!fwx) return;
    const fwvx = fwx.fw_versions.find(
      (fwv) => fwv.fw_version === this._selected.fw_version
    );
    console.log("Version", fwvx);
    if (!fwvx) return;
    const resp = await this.hass.connection.sendMessagePromise<{
      ok: "ok" | "error";
      message: string;
    }>({
      type: "mysensors/fota",
      config_entry: this._getConfigEntryId(),
      node_id: this.device.node_id,
      fw_type: fwx.fw_type,
      fw_ver: semver2int(fwvx.fw_version || "0.0.0"),
      filename: fwvx.fw_filename,
    });
    if (resp.ok === "ok") {
      showAlertDialog(this, {
        title: "FOTA scheduled successful",
        text: "The node(s) will be requested to restart at the next connection.",
        confirmText: "ok",
      });
    } else {
      showAlertDialog(this, {
        title: "Upload failed",
        text: resp.message,
        confirmText: "ok",
      });
    }
    this.dispatchEvent(new CustomEvent("close"));
  }

  protected render(): TemplateResult {
    return html`
      <h2>MySensors Firmware</h2>
      <ha-dialog
        .open=${true}
        _closed="$_{this.closeDialog}"
        scrimClickAction
        escapeKeyAction
        hideActions
        heading="Firmware setup Node:${this.device.node_id}"
      >
        ${this.device.firmware?.bloader_ver
          ? html`
              <ha-card header="Current Firmware">
                <div class="card-content">
                  ${this.device.firmware?.fw_type === 65535
                    ? html`No pre-installed firmware on the node. Choose the
                      firmware to install for the first time.`
                    : html`
                        <div class="attribute-container">
                          <div class="data-entry">
                            <div class="key">Type</div>
                            <div class="value">
                              ${this.device.firmware?.fw_type}
                            </div>
                          </div>
                          <div class="data-entry">
                            <div class="key">Version</div>
                            <div class="value">
                              ${int2semver(this.device.firmware.fw_ver)}
                              [${this.device.firmware?.fw_ver}]
                            </div>
                          </div>
                          <div class="data-entry">
                            <div class="key">Blocks</div>
                            <div class="value">
                              ${this.device.firmware?.fw_blocks}
                            </div>
                          </div>
                          <div class="data-entry">
                            <div class="key">CRC</div>
                            <div class="value">
                              ${this.device.firmware?.fw_crc}
                            </div>
                          </div>
                          <div class="data-entry">
                            <div class="key">Bootloader Version</div>
                            <div class="value">
                              ${this.device.firmware?.bloader_ver}
                            </div>
                          </div>
                        </div>
                      `}
                </div>
              </ha-card>
              <ha-card>
                <div class="card-header">
                  Available firmwares
                  <ha-switch
                    .checked=${this._filter}
                    class="end"
                    @change=${
                      // eslint-disable-next-line lit/no-template-arrow
                      () => {
                        this._filter = !this._filter;
                      }
                    }
                  ></ha-switch>
                </div>
                <div class="card-content">
                  ${this._firmwares
                    .filter(
                      (fw) =>
                        !this._filter ||
                        fw.fw_type === this.device.firmware?.fw_type ||
                        this.device.firmware?.fw_type === 65535
                    )
                    .map(
                      (firmware, index) =>
                        html`
                          <div class="fwblock">
                            <ha-chip
                              id="fw_${index}"
                              class=${classMap({
                                selected:
                                  this._selected.fw_type === firmware.fw_type &&
                                  this._selected.fw_version ===
                                    this._selected_fw_version[firmware.fw_type],
                              })}
                              @click=${
                                // eslint-disable-next-line lit/no-template-arrow
                                () => this._selectFirmware(firmware, index)
                              }
                            >
                              ${firmware.fw_name}
                              ${firmware.fw_type}.${this._selected_fw_version[
                                ifDefined(firmware.fw_type)
                              ] || "?"}
                            </ha-chip>
                            <mwc-menu
                              id="fw_menu_${index}"
                              .anchor=${this.shadowRoot?.getElementById(
                                "fw_" + index
                              )}
                              @selected=${
                                // eslint-disable-next-line lit/no-template-arrow
                                (ev) => {
                                  if (
                                    firmware.fw_type !== undefined &&
                                    ev.target.items[ev.detail.index] !==
                                      undefined
                                  ) {
                                    this._selected_fw_version[
                                      firmware.fw_type
                                    ] = ev.target.items[ev.detail.index].value;
                                    this._selectFirmware(firmware, index);
                                  }
                                }
                              }
                            >
                              <mwc-list-item disabled
                                >${firmware.fw_name}
                                ${firmware.fw_type}.*</mwc-list-item
                              >
                              <li divider></li>
                              ${firmware.fw_versions.map(
                                (version) => html`
                                  <mwc-list-item
                                    .value=${version.fw_version || ""}
                                  >
                                    <span
                                      >${firmware.fw_type}.${version.fw_version}</span
                                    >
                                  </mwc-list-item>
                                `
                              )}
                            </mwc-menu>
                          </div>
                        `
                    )}
                  <div _class="card-actions">
                    <ha-file-upload
                      .hass=${this.hass}
                      .uploading=${this._uploading}
                      .icon=${mdiFolderUpload}
                      accept="application/hex"
                      label="Upload new Firmware"
                      @file-picked=${this._uploadFile}
                    ></ha-file-upload>
                  </div>
                </div>
              </ha-card>
            `
          : html`Information regarding the firmware installed on the node could
            not be found. This can happen if the node does not support firmware
            over the air (FOTA) upgrades or if the node has not performed any
            reboots recently. In this case it is recommended to request a node
            reboot.`}

        <div class="card-actions">
          <mwc-button
            @click=${
              // eslint-disable-next-line lit/no-template-arrow
              () => {
                this.dispatchEvent(new CustomEvent("close"));
              }
            }
            slot="secondaryAction"
          >
            ${this.hass.localize("ui.dialogs.generic.cancel")}
          </mwc-button>

          <mwc-button
            @click=${this._confirm}
            slot="primaryAction"
            style="float: right;"
            ?disabled=${!this._selected.fw_type || !this._selected.fw_version}
          >
            ${this.hass.localize("ui.dialogs.generic.ok")}
          </mwc-button>
        </div>
      </ha-dialog>
    `;
  }

  static get styles(): CSSResultGroup {
    return [
      haStyle,
      haStyleDialog,
      css`
        :host([inert]) {
          pointer-events: initial !important;
          cursor: initial !important;
        }

        ha-card:first-child {
          margin-bottom: 16px;
        }

        a {
          color: var(--primary-color);
        }
        p {
          margin: 0;
          padding-top: 6px;
          padding-bottom: 24px;
          color: var(--primary-text-color);
        }
        .no-bottom-padding {
          padding-bottom: 0;
        }
        .secondary {
          color: var(--secondary-text-color);
        }
        ha-dialog {
          /* Place above other dialogs */
          --dialog-z-index: 104;
        }
        .warning {
          color: var(--warning-color);
        }

        .selected {
          --ha-chip-background-color: var(--primary-color);
        }

        .red {
          --ha-chip-background-color: var(--label-badge-red, #df4c1e);
        }

        .yellow {
          --ha-chip-background-color: var(--label-badge-yellow, #f4b400);
        }

        .blue {
          --ha-chip-background-color: var(--label-badge-blue, #039be5);
        }
        .green {
          --ha-chip-background-color: var(--label-badge-green, #0da035);
        }

        .fwblock {
          position: relative;
          display: inline-block;
        }

        .compact > mwc-list-item {
          height: auto;
        }

        .attribute-container {
          margin-bottom: 8px;
        }
        .data-entry {
          display: flex;
          flex-direction: row;
          justify-content: space-between;
        }
        .data-entry .value {
          max-width: 60%;
          overflow-wrap: break-word;
          text-align: right;
        }
        .key {
          flex-grow: 1;
        }

        .end {
          float: right;
        }
      `,
    ];
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "mysensors-firmware-dialog": HaDialogFwMySensors;
  }
}
