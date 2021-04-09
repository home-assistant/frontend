import {
  css,
  CSSResultGroup,
  customElement,
  html,
  state,
  LitElement,
  property,
  TemplateResult,
} from "lit-element";
import { mdiCheckCircle, mdiCloseCircle } from "@mdi/js";
import "@material/mwc-button/mwc-button";
import { haStyleDialog } from "../../../../../resources/styles";
import { HomeAssistant } from "../../../../../types";
import { ZHAReconfigureDeviceDialogParams } from "./show-dialog-zha-reconfigure-device";
import "../../../../../components/ha-circular-progress";
import "../../../../../components/ha-svg-icon";
import {
  AttributeConfigurationStatus,
  Cluster,
  ClusterConfigurationEvent,
  ClusterConfigurationStatus,
  fetchClustersForZhaNode,
  reconfigureNode,
  ZHA_CHANNEL_CFG_DONE,
  ZHA_CHANNEL_MSG_BIND,
  ZHA_CHANNEL_MSG_CFG_RPT,
} from "../../../../../data/zha";
import { fireEvent } from "../../../../../common/dom/fire_event";
import { UnsubscribeFunc } from "home-assistant-js-websocket";
import { createCloseHeading } from "../../../../../components/ha-dialog";

@customElement("dialog-zha-reconfigure-device")
class DialogZHAReconfigureDevice extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @state() private _status?: string;

  @state() private _stages?: string[];

  @state() private _clusterConfigurationStatuses?: Map<
    number,
    ClusterConfigurationStatus
  > = new Map();

  @state() private _params:
    | ZHAReconfigureDeviceDialogParams
    | undefined = undefined;

  @state() private _allSuccessful = true;

  @state() private _showDetails = false;

  private _subscribed?: Promise<UnsubscribeFunc>;

  public showDialog(params: ZHAReconfigureDeviceDialogParams): void {
    this._params = params;
    this._stages = undefined;
  }

  public closeDialog(): void {
    this._unsubscribe();
    this._params = undefined;
    this._status = undefined;
    this._stages = undefined;
    this._clusterConfigurationStatuses = undefined;
    fireEvent(this, "dialog-closed", { dialog: this.localName });
  }

  protected render(): TemplateResult {
    if (!this._params) {
      return html``;
    }

    return html`
      <ha-dialog
        open
        @closed="${this.closeDialog}"
        .heading=${createCloseHeading(
          this.hass,
          this.hass.localize(`ui.dialogs.zha_reconfigure_device.heading`) +
            ": " +
            (this._params?.device.user_given_name || this._params?.device.name)
        )}
      >
        ${!this._status
          ? html`
              <p>
                ${this.hass.localize(
                  "ui.dialogs.zha_reconfigure_device.introduction"
                )}
              </p>
              <p>
                <em>
                  ${this.hass.localize(
                    "ui.dialogs.zha_reconfigure_device.battery_device_warning"
                  )}
                </em>
              </p>
              <mwc-button
                slot="primaryAction"
                @click=${this._startReconfiguration}
              >
                ${this.hass.localize(
                  "ui.dialogs.zha_reconfigure_device.start_reconfiguration"
                )}
              </mwc-button>
            `
          : ``}
        ${this._status === "started"
          ? html`
              <div class="flex-container">
                <ha-circular-progress active></ha-circular-progress>
                <div class="status">
                  <p>
                    <b>
                      ${this.hass.localize(
                        "ui.dialogs.zha_reconfigure_device.in_progress"
                      )}
                    </b>
                  </p>
                  <p>
                    ${this.hass.localize(
                      "ui.dialogs.zha_reconfigure_device.run_in_background"
                    )}
                  </p>
                </div>
              </div>
              <mwc-button slot="primaryAction" @click=${this.closeDialog}>
                ${this.hass.localize("ui.dialogs.generic.close")}
              </mwc-button>
              <mwc-button slot="secondaryAction" @click=${this._toggleDetails}>
                ${this._showDetails
                  ? this.hass.localize(
                      `ui.dialogs.zha_reconfigure_device.button_hide`
                    )
                  : this.hass.localize(
                      `ui.dialogs.zha_reconfigure_device.button_show`
                    )}
              </mwc-button>
            `
          : ``}
        ${this._status === "failed"
          ? html`
              <div class="flex-container">
                <ha-svg-icon
                  .path=${mdiCloseCircle}
                  class="failed"
                ></ha-svg-icon>
                <div class="status">
                  <p>
                    ${this.hass.localize(
                      "ui.dialogs.zha_reconfigure_device.configuration_failed"
                    )}
                  </p>
                </div>
              </div>
              <mwc-button slot="primaryAction" @click=${this.closeDialog}>
                ${this.hass.localize("ui.dialogs.generic.close")}
              </mwc-button>
              <mwc-button slot="secondaryAction" @click=${this._toggleDetails}>
                ${this._showDetails
                  ? this.hass.localize(
                      `ui.dialogs.zha_reconfigure_device.button_hide`
                    )
                  : this.hass.localize(
                      `ui.dialogs.zha_reconfigure_device.button_show`
                    )}
              </mwc-button>
            `
          : ``}
        ${this._status === "finished"
          ? html`
              <div class="flex-container">
                <ha-svg-icon
                  .path=${mdiCheckCircle}
                  class="success"
                ></ha-svg-icon>
                <div class="status">
                  <p>
                    ${this.hass.localize(
                      "ui.dialogs.zha_reconfigure_device.configuration_complete"
                    )}
                  </p>
                </div>
              </div>
              <mwc-button slot="primaryAction" @click=${this.closeDialog}>
                ${this.hass.localize("ui.dialogs.generic.close")}
              </mwc-button>
              <mwc-button slot="secondaryAction" @click=${this._toggleDetails}>
                ${this._showDetails
                  ? this.hass.localize(
                      `ui.dialogs.zha_reconfigure_device.button_hide`
                    )
                  : this.hass.localize(
                      `ui.dialogs.zha_reconfigure_device.button_show`
                    )}
              </mwc-button>
            `
          : ``}
        ${this._stages
          ? html`
              <div class="stages">
                ${this._stages.map(
                  (stage) => html`
                    <span class="stage">
                      <ha-svg-icon
                        .path=${mdiCheckCircle}
                        class="success"
                      ></ha-svg-icon>
                      ${stage}
                    </span>
                  `
                )}
              </div>
            `
          : ""}
        ${this._showDetails
          ? html`
              <div class="wrapper">
                <h2 class="grid-item">
                  ${this.hass.localize(
                    `ui.dialogs.zha_reconfigure_device.cluster_header`
                  )}
                </h2>
                <h2 class="grid-item">
                  ${this.hass.localize(
                    `ui.dialogs.zha_reconfigure_device.bind_header`
                  )}
                </h2>
                <h2 class="grid-item">
                  ${this.hass.localize(
                    `ui.dialogs.zha_reconfigure_device.reporting_header`
                  )}
                </h2>

                ${this._clusterConfigurationStatuses!.size > 0
                  ? html`
                      ${Array.from(
                        this._clusterConfigurationStatuses!.values()
                      ).map(
                        (clusterStatus) => html`
                          <div class="grid-item">
                            ${clusterStatus.cluster.name}
                          </div>
                          <div class="grid-item">
                            ${clusterStatus.bindSuccess !== undefined
                              ? clusterStatus.bindSuccess
                                ? html`
                                    <span class="stage">
                                      <ha-svg-icon
                                        .path=${mdiCheckCircle}
                                        class="success"
                                      ></ha-svg-icon>
                                    </span>
                                  `
                                : html`
                                    <span class="stage">
                                      <ha-svg-icon
                                        .path=${mdiCloseCircle}
                                        class="failed"
                                      ></ha-svg-icon>
                                    </span>
                                  `
                              : ""}
                          </div>
                          <div class="grid-item">
                            ${clusterStatus.attributes.size > 0
                              ? html`
                                  <div class="attributes">
                                    <div class="grid-item">
                                      ${this.hass.localize(
                                        `ui.dialogs.zha_reconfigure_device.attribute`
                                      )}
                                    </div>
                                    <div class="grid-item">
                                      <div>
                                        ${this.hass.localize(
                                          `ui.dialogs.zha_reconfigure_device.min_max_change`
                                        )}
                                      </div>
                                    </div>
                                    ${Array.from(
                                      clusterStatus.attributes.values()
                                    ).map(
                                      (attribute) => html`
                                        <span class="grid-item">
                                          ${attribute.name}:
                                          ${attribute.success
                                            ? html`
                                                <span class="stage">
                                                  <ha-svg-icon
                                                    .path=${mdiCheckCircle}
                                                    class="success"
                                                  ></ha-svg-icon>
                                                </span>
                                              `
                                            : html`
                                                <span class="stage">
                                                  <ha-svg-icon
                                                    .path=${mdiCloseCircle}
                                                    class="failed"
                                                  ></ha-svg-icon>
                                                </span>
                                              `}
                                        </span>
                                        <div class="grid-item">
                                          ${attribute.min}/${attribute.max}/${attribute.change}
                                        </div>
                                      `
                                    )}
                                  </div>
                                `
                              : ""}
                          </div>
                        `
                      )}
                    `
                  : ""}
              </div>
            `
          : ""}
      </ha-dialog>
    `;
  }

  private async _startReconfiguration(): Promise<void> {
    if (!this.hass || !this._params) {
      return;
    }
    this._clusterConfigurationStatuses = new Map(
      (await fetchClustersForZhaNode(this.hass, this._params.device.ieee)).map(
        (cluster: Cluster) => [
          cluster.id,
          {
            cluster: cluster,
            bindSuccess: undefined,
            attributes: new Map<number, AttributeConfigurationStatus>(),
          },
        ]
      )
    );
    this._subscribe(this._params);
    this._status = "started";
  }

  private _handleMessage(message: ClusterConfigurationEvent): void {
    if (message.type === ZHA_CHANNEL_CFG_DONE) {
      this._unsubscribe();
      this._status = this._allSuccessful ? "finished" : "failed";
    } else {
      const clusterConfigurationStatus = this._clusterConfigurationStatuses!.get(
        message.zha_channel_msg_data.cluster_id
      );
      if (message.type === ZHA_CHANNEL_MSG_BIND) {
        if (!this._stages) {
          this._stages = ["binding"];
        }
        const success = message.zha_channel_msg_data.success;
        clusterConfigurationStatus!.bindSuccess = success;
        this._allSuccessful = this._allSuccessful && success;
      }
      if (message.type === ZHA_CHANNEL_MSG_CFG_RPT) {
        if (this._stages && !this._stages.includes("reporting")) {
          this._stages.push("reporting");
        }
        const attributes = message.zha_channel_msg_data.attributes;
        Object.keys(attributes).forEach((name) => {
          const attribute = attributes[name];
          clusterConfigurationStatus!.attributes.set(attribute.id, attribute);
          this._allSuccessful = this._allSuccessful && attribute.success;
        });
      }
      this.requestUpdate();
    }
  }

  private _unsubscribe(): void {
    if (this._subscribed) {
      this._subscribed.then((unsub) => unsub());
      this._subscribed = undefined;
    }
  }

  private _subscribe(params: ZHAReconfigureDeviceDialogParams): void {
    if (!this.hass) {
      return;
    }
    this._subscribed = reconfigureNode(
      this.hass,
      params.device.ieee,
      this._handleMessage.bind(this)
    );
  }

  private _toggleDetails() {
    this._showDetails = !this._showDetails;
  }

  static get styles(): CSSResultGroup {
    return [
      haStyleDialog,
      css`
        .wrapper {
          display: grid;
          grid-template-columns: 3fr 1fr 2fr;
        }
        .attributes {
          display: grid;
          grid-template-columns: 1fr 1fr;
        }
        .grid-item {
          border: 1px solid;
          padding: 7px;
        }
        .success {
          color: var(--success-color);
        }

        .failed {
          color: var(--warning-color);
        }

        .flex-container {
          display: flex;
          align-items: center;
        }

        .stages {
          margin-top: 16px;
        }

        .stage ha-svg-icon {
          width: 16px;
          height: 16px;
        }
        .stage {
          padding: 8px;
        }

        ha-svg-icon {
          width: 68px;
          height: 48px;
        }

        .flex-container ha-circular-progress,
        .flex-container ha-svg-icon {
          margin-right: 20px;
        }
      `,
    ];
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "dialog-zha-reconfigure-device": DialogZHAReconfigureDevice;
  }
}
