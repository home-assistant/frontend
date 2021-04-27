import {
  css,
  CSSResult,
  customElement,
  html,
  internalProperty,
  LitElement,
  property,
  TemplateResult,
} from "lit-element";
import { mdiCheckCircle, mdiClose, mdiExclamationThick } from "@mdi/js";
import "@material/mwc-icon-button/mwc-icon-button";
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
import { computeRTLDirection } from "../../../../../common/util/compute_rtl";

@customElement("dialog-zha-reconfigure-device")
class DialogZHAReconfigureDevice extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @internalProperty() private _active = false;

  @internalProperty() private _clusterConfigurationStatuses?: Map<
    number,
    ClusterConfigurationStatus
  > = new Map();

  @internalProperty() private _params:
    | ZHAReconfigureDeviceDialogParams
    | undefined = undefined;

  @internalProperty() private _allSuccessful = true;

  @internalProperty() private _showDetails = false;

  private _subscribed?: Promise<() => Promise<void>>;

  public async showDialog(
    params: ZHAReconfigureDeviceDialogParams
  ): Promise<void> {
    this._params = params;
    this._clusterConfigurationStatuses = new Map(
      (await fetchClustersForZhaNode(this.hass, params.device.ieee)).map(
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
    this._subscribe(params);
  }

  public closeDialog(): void {
    this._unsubscribe();
    this._params = undefined;
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
        hideActions
        @closing="${this.closeDialog}"
        .heading=${html`
          <span class="header_title">
            ${this.hass.localize(`ui.dialogs.zha_reconfigure_device.heading`)}:
            ${this._params?.device.user_given_name || this._params?.device.name}
          </span>
          <mwc-icon-button
            aria-label=${this.hass.localize("ui.dialogs.generic.close")}
            dialogAction="close"
            class="header_button"
            dir=${computeRTLDirection(this.hass)}
          >
            <ha-svg-icon .path=${mdiClose}></ha-svg-icon>
          </mwc-icon-button>
        `}
      >
        <div class="configuring">
          ${this._active
            ? html`
                <ha-circular-progress
                  active
                  alt=${this.hass.localize(
                    `ui.dialogs.zha_reconfigure_device.configuring_alt`
                  )}
                ></ha-circular-progress>
                <h3>
                  ${this.hass.localize(
                    `ui.dialogs.zha_reconfigure_device.attempting`
                  )}
                </h3>
              `
            : this._allSuccessful
            ? html`
                <ha-svg-icon
                  class="success-fail"
                  .path=${mdiCheckCircle}
                ></ha-svg-icon>
                <h3>
                  ${this.hass.localize(
                    `ui.dialogs.zha_reconfigure_device.succeeded`
                  )}
                </h3>
              `
            : html`
                <ha-svg-icon
                  class="success-fail"
                  .path=${mdiExclamationThick}
                ></ha-svg-icon>
                <h3>
                  ${this.hass.localize(
                    `ui.dialogs.zha_reconfigure_device.failed`
                  )}
                </h3>
              `}
          <mwc-button @click=${this._toggleDetails}>
            ${this._showDetails
              ? this.hass.localize(
                  `ui.dialogs.zha_reconfigure_device.button_hide`
                )
              : this.hass.localize(
                  `ui.dialogs.zha_reconfigure_device.button_show`
                )}
          </mwc-button>
        </div>

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
                                    <ha-svg-icon
                                      .path=${mdiCheckCircle}
                                    ></ha-svg-icon>
                                  `
                                : html`
                                    <ha-svg-icon
                                      .path=${mdiExclamationThick}
                                    ></ha-svg-icon>
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
                                                <ha-svg-icon
                                                  .path=${mdiCheckCircle}
                                                ></ha-svg-icon>
                                              `
                                            : html`
                                                <ha-svg-icon
                                                  .path=${mdiExclamationThick}
                                                ></ha-svg-icon>
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

  private _handleMessage(message: ClusterConfigurationEvent): void {
    // this is currently here to hack rerendering because map updates aren't triggering rendering?
    if (message.type === ZHA_CHANNEL_CFG_DONE) {
      this._unsubscribe();
    } else {
      const clusterConfigurationStatus = this._clusterConfigurationStatuses!.get(
        message.zha_channel_msg_data.cluster_id
      );
      if (message.type === ZHA_CHANNEL_MSG_BIND) {
        const success = message.zha_channel_msg_data.success;
        clusterConfigurationStatus!.bindSuccess = success;
        this._allSuccessful = this._allSuccessful && success;
      }
      if (message.type === ZHA_CHANNEL_MSG_CFG_RPT) {
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
    this._active = false;
    if (this._subscribed) {
      this._subscribed.then((unsub) => unsub());
      this._subscribed = undefined;
    }
  }

  private _subscribe(params: ZHAReconfigureDeviceDialogParams): void {
    if (!this.hass) {
      return;
    }
    this._active = true;
    this._subscribed = reconfigureNode(
      this.hass,
      params.device.ieee,
      this._handleMessage.bind(this)
    );
  }

  private _toggleDetails() {
    this._showDetails = !this._showDetails;
  }

  static get styles(): CSSResult[] {
    return [
      haStyleDialog,
      css`
        ha-circular-progress {
          padding: 20px;
        }
        .configuring {
          margin-top: 20px;
          display: flex;
          flex-direction: column;
          align-items: center;
        }
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
        .success-fail {
          width: 48px;
          height: 48px;
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
