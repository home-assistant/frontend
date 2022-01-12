import {
  css,
  CSSResultGroup,
  html,
  LitElement,
  PropertyValues,
  TemplateResult,
} from "lit";
import { customElement, property, state } from "lit/decorators";
import "../../../../../components/ha-circular-progress";
import "../../../../../components/ha-code-editor";
import { createCloseHeading } from "../../../../../components/ha-dialog";
import {
  fetchOZWNodeMetadata,
  nodeQueryStages,
  OZWDevice,
  OZWDeviceMetaData,
} from "../../../../../data/ozw";
import { haStyleDialog } from "../../../../../resources/styles";
import { HomeAssistant } from "../../../../../types";
import { OZWRefreshNodeDialogParams } from "./show-dialog-ozw-refresh-node";

@customElement("dialog-ozw-refresh-node")
class DialogOZWRefreshNode extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @state() private _node_id?: number;

  @state() private _ozw_instance = 1;

  @state() private _nodeMetaData?: OZWDeviceMetaData;

  @state() private _node?: OZWDevice;

  @state() private _active = false;

  @state() private _complete = false;

  private _refreshDevicesTimeoutHandle?: number;

  private _subscribed?: Promise<() => Promise<void>>;

  public disconnectedCallback(): void {
    super.disconnectedCallback();
    this._unsubscribe();
  }

  protected updated(changedProperties: PropertyValues): void {
    super.update(changedProperties);
    if (changedProperties.has("node_id")) {
      this._fetchData();
    }
  }

  private async _fetchData() {
    if (!this._node_id) {
      return;
    }
    const metaDataResponse = await fetchOZWNodeMetadata(
      this.hass,
      this._ozw_instance,
      this._node_id
    );

    this._nodeMetaData = metaDataResponse.metadata;
  }

  public async showDialog(params: OZWRefreshNodeDialogParams): Promise<void> {
    this._node_id = params.node_id;
    this._ozw_instance = params.ozw_instance;
    this._fetchData();
  }

  protected render(): TemplateResult {
    if (!this._node_id) {
      return html``;
    }

    return html`
      <ha-dialog
        open
        @closed=${this._close}
        .heading=${createCloseHeading(
          this.hass,
          this.hass.localize("ui.panel.config.ozw.refresh_node.title")
        )}
      >
        ${this._complete
          ? html`
              <p>
                ${this.hass.localize(
                  "ui.panel.config.ozw.refresh_node.complete"
                )}
              </p>
              <mwc-button slot="primaryAction" @click=${this._close}>
                ${this.hass.localize("ui.common.close")}
              </mwc-button>
            `
          : html`
              ${this._active
                ? html`
                    <div class="flex-container">
                      <ha-circular-progress active></ha-circular-progress>
                      <div>
                        <p>
                          <b>
                            ${this.hass.localize(
                              "ui.panel.config.ozw.refresh_node.refreshing_description"
                            )}
                          </b>
                        </p>
                        ${this._node
                          ? html`
                              <p>
                                ${this.hass.localize(
                                  "ui.panel.config.ozw.refresh_node.node_status"
                                )}:
                                ${this._node.node_query_stage}
                                (${this.hass.localize(
                                  "ui.panel.config.ozw.refresh_node.step"
                                )}
                                ${nodeQueryStages.indexOf(
                                  this._node.node_query_stage
                                ) + 1}/17)
                              </p>
                              <p>
                                <em>
                                  ${this.hass.localize(
                                    "ui.panel.config.ozw.node_query_stages." +
                                      this._node.node_query_stage.toLowerCase()
                                  )}</em
                                >
                              </p>
                            `
                          : ``}
                      </div>
                    </div>
                  `
                : html`
                    ${this.hass.localize(
                      "ui.panel.config.ozw.refresh_node.description"
                    )}
                    <p>
                      ${this.hass.localize(
                        "ui.panel.config.ozw.refresh_node.battery_note"
                      )}
                    </p>
                  `}
              ${this._nodeMetaData?.WakeupHelp !== ""
                ? html`
                    <b>
                      ${this.hass.localize(
                        "ui.panel.config.ozw.refresh_node.wakeup_header"
                      )}
                      ${this._nodeMetaData!.Name}
                    </b>
                    <blockquote>
                      ${this._nodeMetaData!.WakeupHelp}
                      <br />
                      <em>
                        ${this.hass.localize(
                          "ui.panel.config.ozw.refresh_node.wakeup_instructions_source"
                        )}
                      </em>
                    </blockquote>
                  `
                : ""}
              ${!this._active
                ? html`
                    <mwc-button
                      slot="primaryAction"
                      @click=${this._startRefresh}
                    >
                      ${this.hass.localize(
                        "ui.panel.config.ozw.refresh_node.start_refresh_button"
                      )}
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
    if (this._refreshDevicesTimeoutHandle) {
      clearTimeout(this._refreshDevicesTimeoutHandle);
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
    this._subscribed = this.hass.connection.subscribeMessage(
      (message) => this._handleMessage(message),
      {
        type: "ozw/refresh_node_info",
        node_id: this._node_id,
        ozw_instance: this._ozw_instance,
      }
    );
    this._refreshDevicesTimeoutHandle = window.setTimeout(
      () => this._unsubscribe(),
      120000
    );
  }

  private _close(): void {
    this._complete = false;
    this._node_id = undefined;
    this._node = undefined;
  }

  static get styles(): CSSResultGroup {
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
