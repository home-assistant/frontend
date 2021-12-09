import "./mysensors-firmware-dialog"; /* eslint-disable no-console */
import "@polymer/paper-input/paper-input";
import { css, CSSResultGroup, html, LitElement, TemplateResult } from "lit";
import { customElement, property, state } from "lit/decorators";
import "../../../../../components/ha-card";
import "../../../../../components/ha-chip";
import "../../../../../components/ha-dialog";
import "../../../../../components/ha-icon";
import "../../../../../components/ha-icon-button";
import "../../../../../components/ha-circular-progress";
import "../../../../../components/ha-file-upload";
import { classMap } from "lit/directives/class-map";
import {
  showAlertDialog,
  showConfirmationDialog,
} from "../../../../../dialogs/generic/show-dialog-box";
import { getConfigEntries } from "../../../../../data/config_entries";
import "../../../../../layouts/hass-subpage";
import { haStyle } from "../../../../../resources/styles";
import { HomeAssistant } from "../../../../../types";
import { navigate } from "../../../../../common/navigate";

import "@material/mwc-list/mwc-list";
import "@material/mwc-list/mwc-list-item";
import "@material/mwc-select/mwc-select";
import "@material/mwc-button/mwc-button";
import "@polymer/paper-tooltip/paper-tooltip";
import { MyDevice } from "./mydevice";

@customElement("mysensors-config-panel")
class HaPanelDevMySensors extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @state() private _devices: MyDevice[] = [];

  private _tmp_firmware_upload: { [key: string]: number } = {};

  // @query("#fwDialog") private _fwDialog?: HTMLElement;
  // @query("#fwUpFirmware") private fwUpFirmware?: PaperInputElement;
  // @query("#fwUpFirmwareVersion") private fwUpFirmwareVersion?: PaperInputElement;

  @property({ type: Boolean }) public narrow!: boolean;

  @state() private _title = "";

  @state() private _firmwareDialog: MyDevice | boolean = false;

  protected render(): TemplateResult {
    return html`
      <hass-subpage .narrow=${this.narrow} .hass=${this.hass}>
        <div class="content">
          <ha-card header="MySensors settings ${this._title}">
            <div class="card-actions">
              <mwc-button @click=${this._openOptionFlow}
                >Re-configure MySensors Gateway</mwc-button
              >
            </div>
          </ha-card>
          <ha-card
            header=${this.hass.localize(
              "ui.panel.config.mysensors.description_nodelist"
            )}
          >
            <div class="card-content">
              <!-- Firmware Dialog -->
              ${this._firmwareDialog instanceof MyDevice
                ? html`
                    <mysensors-firmware-dialog
                      .device=${this._firmwareDialog}
                      @close=${
                        // eslint-disable-next-line lit/no-template-arrow
                        () => {
                          this._firmwareDialog = false;
                        }
                      }
                      .hass=${this.hass}
                    ></mysensors-firmware-dialog>
                  `
                : html``}

              <!-- Node List -->
              <mwc-list id="graphics">
                ${this._devices?.map((mydevice, index, _mydevices) => {
                  let batteryLevelIcon = "-unknown";
                  if (mydevice.battery_level < 5) {
                    batteryLevelIcon = "-alert";
                  } else if (mydevice.battery_level < 10) {
                    batteryLevelIcon = "-10";
                  } else if (mydevice.battery_level < 20) {
                    batteryLevelIcon = "-20";
                  } else if (mydevice.battery_level < 30) {
                    batteryLevelIcon = "-30";
                  } else if (mydevice.battery_level < 40) {
                    batteryLevelIcon = "-40";
                  } else if (mydevice.battery_level < 50) {
                    batteryLevelIcon = "-50";
                  } else if (mydevice.battery_level < 60) {
                    batteryLevelIcon = "-60";
                  } else if (mydevice.battery_level < 70) {
                    batteryLevelIcon = "-70";
                  } else if (mydevice.battery_level < 80) {
                    batteryLevelIcon = "-80";
                  } else if (mydevice.battery_level < 90) {
                    batteryLevelIcon = "-90";
                  } else if (mydevice.battery_level !== undefined) {
                    batteryLevelIcon = "";
                  }

                  let firmware_icon = "mdi:chip";
                  if (
                    typeof mydevice.firmware?.fw_req_block === "number" &&
                    mydevice.firmware?.fw_req_block > 0
                  ) {
                    firmware_icon =
                      "mdi:circle-slice-" +
                      (8 -
                        Math.trunc(
                          (mydevice.firmware?.fw_req_block /
                            (mydevice.firmware?.fw_max_blocks || 1)) *
                            8
                        ));
                    console.log(
                      firmware_icon,
                      mydevice.firmware?.fw_req_block,
                      mydevice.firmware?.fw_max_blocks
                    );
                  }

                  let deviceName = mydevice.device_name_by_user
                    ? mydevice.device_name_by_user
                    : mydevice.device_name
                    ? mydevice.device_name
                    : html`*Unknown*`;
                  if (mydevice.node_id === 0) deviceName = `Gateway`;

                  return html`
                    <mwc-list-item
                      twoline
                      multipleGraphics
                      graphic="avatar"
                      hasMeta
                    >
                      <mwc-button
                        slot="graphic"
                        @click=${
                          // eslint-disable-next-line lit/no-template-arrow
                          () =>
                            navigate(
                              `/config/devices/device/${mydevice.device_id}`
                            )
                        }
                        ?disabled=${mydevice.device_id == null}
                      >
                        <ha-icon slot="icon" icon="mdi:identifier"></ha-icon
                        ><span class="graphiccenter">${mydevice.node_id}</span>
                      </mwc-button>

                      <span
                        id="dev_${index}"
                        class="deviceitem"
                        @click=${
                          // eslint-disable-next-line lit/no-template-arrow
                          () => this._showDeviceInfoDialog(mydevice)
                        }
                      >
                        ${deviceName}
                      </span>
                      <span id="sl_${index}" slot="secondary">
                        ${mydevice.sketch_name
                          ? html`
                              <ha-chip
                                id="sx_${index}"
                                hasIcon
                                @click=${
                                  // eslint-disable-next-line lit/no-template-arrow
                                  () => {
                                    this._firmwareDialog =
                                      (mydevice.firmware?.fw_req_block || 0) > 0
                                        ? false
                                        : mydevice;
                                  }
                                }
                                class=${classMap({
                                  blink:
                                    (mydevice.firmware?.fw_req_block || 0) > 0,
                                })}
                              >
                                <ha-icon
                                  slot="icon"
                                  icon=${firmware_icon}
                                ></ha-icon>
                                ${mydevice.sketch_name
                                  ? mydevice.sketch_name
                                  : ""}
                                ${mydevice.sketch_version
                                  ? mydevice.sketch_version
                                  : "*Unknown*"}
                              </ha-chip>
                              ${(mydevice.firmware?.fw_req_block || 0) > 0
                                ? html`
                                    <paper-tooltip
                                      for="sx_${index}"
                                      position="top"
                                      >Progress..
                                      ${mydevice.firmware
                                        ?.fw_req_block}/${mydevice.firmware
                                        ?.fw_max_blocks}
                                      blocks</paper-tooltip
                                    >
                                  `
                                : ""}
                            `
                          : html``}
                        ${mydevice.device_id
                          ? html` <ha-chip
                              hasIcon
                              @click=${
                                // eslint-disable-next-line lit/no-template-arrow
                                () => mydevice.reboot || this.reboot(mydevice)
                              }
                              ?disabled=${mydevice.reboot}
                              class=${classMap({ yellow: !mydevice.reboot })}
                            >
                              ${!mydevice.reboot
                                ? html`<ha-icon
                                    slot="icon"
                                    icon="mdi:power-cycle"
                                  >
                                  </ha-icon>`
                                : html`<ha-circular-progress
                                    slot="icon"
                                    size="tiny"
                                    active
                                  >
                                  </ha-circular-progress>`}
                              Reboot
                            </ha-chip>`
                          : html``}
                        ${mydevice.device_id
                          ? html` <ha-chip
                              hasIcon
                              @click=${
                                // eslint-disable-next-line lit/no-template-arrow
                                () => this.removeNode(mydevice)
                              }
                              class="red"
                            >
                              <ha-icon slot="icon" icon="mdi:trash-can-outline">
                              </ha-icon>
                              Remove
                            </ha-chip>`
                          : html``}
                      </span>
                      <span slot="meta">
                        ${mydevice.battery_level !== undefined
                          ? html` <ha-icon
                                id="bt_${index}"
                                slot="icon"
                                icon="mdi:battery${batteryLevelIcon}"
                              ></ha-icon>
                              <paper-tooltip for="bt_${index}" position="left"
                                >${mydevice.battery_level}%</paper-tooltip
                              >`
                          : html``}
                        ${mydevice.heartbeat
                          ? html` <ha-icon
                                id="ht_${index}"
                                slot="icon"
                                icon="mdi:puzzle-heart${mydevice.hearbeat_state
                                  ? "-outline"
                                  : ""}"
                              ></ha-icon>
                              <paper-tooltip for="ht_${index}" position="left"
                                >${mydevice.heartbeat}</paper-tooltip
                              >`
                          : html``}
                      </span>
                    </mwc-list-item>
                    <li divider role="separator"></li>
                  `;
                })}
              </mwc-list>
            </div>
            <div class="card-actions">
              <!--
                  <mwc-button @click=$_{this._publish}>$_{this.hass.localize(
      "ui.panel.config.mysensors.updateall"
    )}</mwc-button>
                  -->
              <!--
 
                  -->
            </div>
          </ha-card>
        </div>
      </hass-subpage>
    `;
  }

  private async _showDeviceInfoDialog(mydevice: MyDevice) {
    let htmlattrlist = html`<ul></ul>`;
    Object.keys(mydevice)
      .filter((obk) => ["entity_id"].indexOf(obk) === -1)
      .forEach((obk) => {
        htmlattrlist = html`${htmlattrlist}
          <li>${obk}:${JSON.stringify(mydevice[obk])}</li>`;
      });
    htmlattrlist = html`${htmlattrlist}</ul>`;

    showAlertDialog(this, {
      title: mydevice.device_name,
      text: htmlattrlist,
      confirmText: "ok",
    });
  }

  private async _refreshDevices(): Promise<MyDevice[]> {
    return new Promise((resolve, reject) => {
      if (this.hass !== undefined) {
        this.hass.connection
          .sendMessagePromise<any>({
            type: "mysensors/device_list",
            config_entry: this._getConfigEntryId(),
          })
          .then(
            (resp) => {
              this._devices = (resp.list as []).reduce(
                (prev: MyDevice[], dev: any, _index, _all: MyDevice[]) => {
                  const ndev = new MyDevice();
                  Object.assign(ndev, dev);
                  const odev = this._devices.find(
                    (cdev) => cdev.getDeviceId() === ndev.getDeviceId()
                  );
                  if (odev && ndev.heartbeat !== odev.heartbeat) {
                    ndev.hearbeat_state = !odev.hearbeat_state;
                  } else {
                    ndev.hearbeat_state = odev?.hearbeat_state;
                  }
                  prev.push(ndev);
                  return prev;
                },
                []
              );
              resolve(this._devices);
            },
            (err) => {
              console.error("Unable to fetch Device list!", err);
              reject();
            }
          );
      } else {
        alert("Unable to connect to Hass core!");
        reject();
      }
    });
  }

  private async _refresh(): Promise<void> {
    return new Promise((resolve) => {
      Promise.all([
        this._refreshDevices().then(async (devices) => {
          devices.forEach((device) => {
            const entity_id = Object.keys(this.hass.states).find(
              (i_entity_id) =>
                this.hass.states[i_entity_id].attributes.device ===
                  this._title &&
                this.hass.states[i_entity_id].attributes.node_id ===
                  device.node_id
            );
            if (entity_id) {
              device.entity_id = entity_id;
              device.firmware = {
                bloader_ver:
                  this.hass.states[entity_id].attributes.firmware.bl_version,
                fw_blocks:
                  this.hass.states[entity_id].attributes.firmware.blocks,
                fw_crc: this.hass.states[entity_id].attributes.firmware.crc,
                fw_type: this.hass.states[entity_id].attributes.firmware.type,
                fw_ver: this.hass.states[entity_id].attributes.firmware.version,
                fw_req_block:
                  this.hass.states[entity_id].attributes.firmware.req_block,
                fw_max_blocks:
                  this.hass.states[entity_id].attributes.firmware
                    .req_total_blocks,
              };
            }
            // console.log(device);
          });
        }),
      ])
        .then(async () => {
          resolve();
        })
        .then(() => {
          this.requestUpdate();
        })
        .then(() => {
          setTimeout(() => this._refresh(), 1000);
        });
    });
  }

  async firstUpdated(
    changedProperties: Map<string | number | symbol, unknown>
  ) {
    super.firstUpdated(changedProperties);
    this._getConfigEntry().then((value) => {
      this._title = value.title;
    });
    this._refresh();
  }

  private updateUploadProgress(device: MyDevice) {
    console.log(device);
    if (this.hass !== undefined)
      this.hass.connection
        .sendMessagePromise<any>({
          type: "mycontrol/ota_status",
          gateway_id: device.gateway,
          node_id: device.node_id,
        })
        .then(
          (resp) => {
            console.log("Message success!", device, resp);
            this._tmp_firmware_upload[device.getDeviceId()] = resp.progress;
            this.performUpdate();
            if (resp.progress < 100) {
              setTimeout(() => this.updateUploadProgress(device), 1000);
            } else {
              delete this._tmp_firmware_upload[device.getDeviceId()];
            }
          },
          (err) => {
            console.error("Message failed!", err);
          }
        );
  }

  async reboot(device: MyDevice) {
    showConfirmationDialog(this, {
      title: "Confirm Reboot",
      text: "The reboot event will be sent at the next node incoming event",
      confirmText: "reboot",
      dismissText: "cancel",
    }).then((boot) => {
      if (boot && this.hass !== undefined)
        this.hass.connection.sendMessage({
          type: "mysensors/reboot",
          config_entry: device.gateway,
          node_id: device.node_id,
        });
      this.performUpdate();
    });
  }

  async removeNode(device: MyDevice) {
    showConfirmationDialog(this, {
      title: "Confirm Remove",
      text: "ATTENTION: Experimental feature not yet ready. Please Abort!",
      confirmText: "remove",
      dismissText: "cancel",
    }).then((remove) => {
      if (remove && this.hass !== undefined)
        this.hass.connection.sendMessage({
          type: "mysensors/remove",
          config_entry: device.gateway,
          node_id: device.node_id,
        });
      this.performUpdate();
    });
  }

  async uploadFirmware(device: MyDevice) {
    this._tmp_firmware_upload[device.getDeviceId()] = 0;
    if (this.hass !== undefined)
      this.hass.connection.sendMessage({
        type: "mycontrol/ota",
        gateway_id: device.gateway,
        node_id: device.node_id,
      });
    this.updateUploadProgress(device);
  }

  private _getConfigEntryId(): string {
    const searchParams = new URLSearchParams(window.location.search);
    if (!searchParams.has("config_entry")) {
      return "";
    }
    return searchParams.get("config_entry") as string;
  }

  private async _getConfigEntry(): Promise<any> {
    return new Promise((resolve) => {
      const configEntryId = this._getConfigEntryId();
      getConfigEntries(this.hass).then((configEntries) => {
        resolve(
          configEntries.find((entry) => entry.entry_id === configEntryId)
        );
      });
    });
  }

  private async _openOptionFlow() {
    const configEntry = await this._getConfigEntry();
    console.log(configEntry);
    // showOptionsFlowDialog(this, configEntry!);
  }

  static get styles(): CSSResultGroup {
    return [
      haStyle,
      css`
        :host {
          -ms-user-select: initial;
          -webkit-user-select: initial;
          -moz-user-select: initial;
        }

        .content {
          padding: 24px 0 32px;
          max-width: 600px;
          margin: 0 auto;
          direction: ltr;
        }
        ha-card:first-child {
          margin-bottom: 16px;
        }

        .deviceitem {
          padding-bottom: 0px;
          display: block;
          margin-top: -2em;
        }

        .graphiccenter {
          padding-top: 0.4em;
        }

        .buttoncenter {
          padding-top: 0.75em;
        }

        .blink {
          animation: blink 1s linear infinite;
        }

        @keyframes blink {
          0% {
            --ha-chip-background-color: transparent;
          }
          50% {
            --ha-chip-background-color: var(--warning-color);
          }
          100% {
            --ha-chip-background-color: initial;
          }
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
      `,
    ];
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "mysensors-config-panel": HaPanelDevMySensors;
  }
}
