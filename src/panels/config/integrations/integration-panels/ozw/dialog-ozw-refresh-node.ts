import {
  CSSResult,
  customElement,
  html,
  LitElement,
  property,
  internalProperty,
  TemplateResult,
  PropertyValues,
  css,
} from "lit-element";
import "../../../../../components/ha-code-editor";
import "../../../../../components/ha-circular-progress";
import { createCloseHeading } from "../../../../../components/ha-dialog";
import { haStyleDialog } from "../../../../../resources/styles";
import { HomeAssistant } from "../../../../../types";
import { OZWRefreshNodeDialogParams } from "./show-dialog-ozw-refresh-node";

import {
  OZWNodeIdentifiers,
  getIdentifiersFromDevice,
  fetchOZWNodeMetadata,
  OZWDeviceMetaData,
  OZWDevice,
} from "../../../../../data/ozw";
import { DeviceRegistryEntry } from "../../../../../data/device_registry";

@customElement("dialog-ozw-refresh-node")
class DialogOZWRefreshNode extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property()
  private node_id = 0;

  @property()
  private ozw_instance = 1;

  @internalProperty() private _device?: DeviceRegistryEntry;

  @internalProperty() private _nodeMetaData?: OZWDeviceMetaData;

  @internalProperty() private _node?: OZWDevice;

  @internalProperty() private _active = false;

  @internalProperty() private _complete = false;

  @internalProperty() private _progress = [
    "ProtocolInfo",
    "Probe",
    "WakeUp",
    "ManufacturerSpecific1",
    "NodeInfo",
    "NodePlusInfo",
    "ManufacturerSpecific2",
    "Versions",
    "Instances",
    "Static",
    "CacheLoad",
    "Associations",
    "Neighbors",
    "Session",
    "Dynamic",
    "Configuration",
    "Complete",
  ];

  private _addDevicesTimeoutHandle: any = undefined;

  private _subscribed?: Promise<() => Promise<void>>;

  public disconnectedCallback(): void {
    super.disconnectedCallback();
    this._unsubscribe();
  }

  protected updated(changedProperties: PropertyValues): void {
    super.update(changedProperties);
    if (changedProperties.has("_device")) {
      this._fetchData(this._device);
    }
  }

  private async _fetchData(device) {
    const identifiers: OZWNodeIdentifiers | false = getIdentifiersFromDevice(
      device
    );
    if (!identifiers) return;
    this.ozw_instance = identifiers.ozw_instance;
    this.node_id = identifiers.node_id;

    const metaDataResponse = await fetchOZWNodeMetadata(
      this.hass,
      this.ozw_instance,
      this.node_id
    );

    this._nodeMetaData = metaDataResponse.metadata;
  }

  public async showDialog(params: OZWRefreshNodeDialogParams): Promise<void> {
    this._device = params.device;
  }

  protected render(): TemplateResult {
    if (!this._device) {
      return html``;
    }

    return html`
      <ha-dialog
        open
        hideActions
        @closing="${this._close}"
        .heading=${createCloseHeading(this.hass, "Refresh Node Information")}
      >
        ${this._complete
          ? html`
              <p>Node Refresh complete</p>
              <mwc-button @click=${this._close}>
                Close
              </mwc-button>
            `
          : html`
              ${this._active
                ? html`
                    <div class="flex-container">
                      <ha-circular-progress active></ha-circular-progress>
                      <div>
                        <p><b>Refreshing node information...</b></p>
                        <p>
                          Node Status: ${this._node!.node_query_stage} (Step
                          ${this._progress.indexOf(
                            this._node!.node_query_stage
                          ) + 1}/17)
                        </p>
                        <p>
                          <em
                            >${this.hass.localize(
                              "ui.panel.config.ozw.node_query_stages." +
                                this._node!.node_query_stage.toLowerCase()
                            )}</em
                          >
                        </p>
                      </div>
                    </div>
                  `
                : html`
                    This will tell OpenZWave to re-interview a node and update
                    the node's command classes, capabilities, and values.
                    <p>
                      If the node is battery powered, be sure to wake it before
                      proceeding.
                    </p>
                  `}
              ${this._nodeMetaData?.WakeupHelp !== ""
                ? html`
                    <b>Wakeup Instructions for ${this._nodeMetaData?.Name}</b>
                    <blockquote>
                      ${this._nodeMetaData?.WakeupHelp}
                      <br />
                      <em>
                        Wakeup instructions are sourced from the OpenZWave
                        community device database.
                      </em>
                    </blockquote>
                  `
                : ""}
              ${!this._active
                ? html`
                    <mwc-button @click=${this._startRefresh}>
                      Start Refresh
                    </mwc-button>
                  `
                : html``}
            `}
      </ha-dialog>
    `;
  }

  private _startRefresh(): void {
    this._subscribe();
  }

  private _handleMessage(message: any): void {
    if (message.type === "node_updated") {
      this._node = message;
      if (message.node_query_stage === "Complete") {
        this._unsubscribe();
        this._complete = true;
      }
    }
  }

  private _unsubscribe(): void {
    this._active = false;
    if (this._addDevicesTimeoutHandle) {
      clearTimeout(this._addDevicesTimeoutHandle);
    }
    if (this._subscribed) {
      this._subscribed.then((unsub) => unsub());
      this._subscribed = undefined;
    }
  }

  private _subscribe(): void {
    if (!this.hass) {
      return;
    }
    this._active = true;
    const data: any = { type: "ozw/refresh_node_info" };
    data.node_id = this.node_id;
    data.ozw_instance = this.ozw_instance;
    this._subscribed = this.hass.connection.subscribeMessage(
      (message) => this._handleMessage(message),
      data
    );
    this._addDevicesTimeoutHandle = setTimeout(
      () => this._unsubscribe(),
      120000
    );
  }

  private _close(): void {
    this._device = undefined;
    this._complete = false;
  }

  static get styles(): CSSResult[] {
    return [
      haStyleDialog,
      css`
        blockquote {
          display: block;
          background-color: #ddd;
          padding: 8px;
          margin: 8px 0;
          font-size: 0.9em;
        }

        blockquote em {
          font-size: 0.9em;
          margin-top: 6px;
        }

        .flex-container {
          display: flex;
          align-items: center;
        }

        .flex-container ha-circular-progress {
          margin-right: 20px;
        }
      `,
    ];
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "dialog-ozw-refresh-node": DialogOZWRefreshNode;
  }
}
