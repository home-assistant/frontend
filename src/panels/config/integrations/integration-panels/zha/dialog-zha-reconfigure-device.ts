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
import { haStyleDialog } from "../../../../../resources/styles";
import { HomeAssistant } from "../../../../../types";
import { ZHAReconfigureDeviceDialogParams } from "./show-dialog-zha-reconfigure-device";
import "@polymer/paper-input/paper-textarea";
import "../../../../../components/ha-circular-progress";
import {
  AttributeConfigurationStatus,
  CHANNEL_MESSAGE_TYPES,
  Cluster,
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

  @internalProperty() private _clusterConfigurationStatuses: Map<
    number,
    ClusterConfigurationStatus
  > = new Map();

  @internalProperty()
  private _params: ZHAReconfigureDeviceDialogParams | undefined = undefined;

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
    this._clusterConfigurationStatuses = new Map();
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
          <span class="header_title"
            >${this.hass.localize(`ui.dialogs.zha_reconfigure_device.heading`)}:
            ${this._params?.device.user_given_name ||
            this._params?.device.name}</span
          >
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
        <div class="searching">
          ${this._active
            ? html`
                <ha-circular-progress
                  active
                  alt="Configuring"
                ></ha-circular-progress>
              `
            : ""}
        </div>
        ${this._clusterConfigurationStatuses.size > 0
          ? html`${Array.from(this._clusterConfigurationStatuses.values()).map(
              (clusterStatus) => html`<paper-item>
                <paper-item-body three-line>
                  <div>${clusterStatus.cluster.name}</div>
                  <div secondary>
                    Bind Successful:
                    ${clusterStatus.bindSuccess !== undefined
                      ? clusterStatus.bindSuccess
                        ? html`<ha-svg-icon
                            .path=${mdiCheckCircle}
                          ></ha-svg-icon>`
                        : html`<ha-svg-icon
                            .path=${mdiExclamationThick}
                          ></ha-svg-icon>`
                      : ""}
                  </div>
                  <div secondary>
                    Configure Reporting Successful:
                    ${clusterStatus.bindSuccess !== undefined
                      ? clusterStatus.bindSuccess
                        ? html`<ha-svg-icon
                            .path=${mdiCheckCircle}
                          ></ha-svg-icon>`
                        : html`<ha-svg-icon
                            .path=${mdiExclamationThick}
                          ></ha-svg-icon>`
                      : ""}
                  </div>
                </paper-item-body>
              </paper-item>`
            )}`
          : ""}
      </ha-dialog>
    `;
  }

  private _handleMessage(message: any): void {
    if (CHANNEL_MESSAGE_TYPES.includes(message.type)) {
      if (message.type === ZHA_CHANNEL_CFG_DONE) {
        this._unsubscribe();
      } else {
        const clusterConfigurationStatus = this._clusterConfigurationStatuses.get(
          message.zha_channel_msg_data.cluster_id
        );
        if (message.type === ZHA_CHANNEL_MSG_BIND) {
          clusterConfigurationStatus!.bindSuccess =
            message.zha_channel_msg_data.success;
        }
        if (message.type === ZHA_CHANNEL_MSG_CFG_RPT) {
          const attributes = message.zha_channel_msg_data.attributes;
          Object.keys(attributes).forEach((name) =>
            clusterConfigurationStatus!.attributes.set(
              attributes[name].id,
              attributes[name]
            )
          );
        }
      }
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

  static get styles(): CSSResult[] {
    return [
      haStyleDialog,
      css`
        ha-circular-progress {
          padding: 20px;
        }
        .searching {
          margin-top: 20px;
          display: flex;
          flex-direction: column;
          align-items: center;
        }
        .log {
          padding: 16px;
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
