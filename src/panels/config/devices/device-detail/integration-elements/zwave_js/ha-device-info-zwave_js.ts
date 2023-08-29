import { UnsubscribeFunc } from "home-assistant-js-websocket";
import {
  css,
  CSSResultGroup,
  html,
  LitElement,
  PropertyValues,
  nothing,
} from "lit";
import { customElement, property, state } from "lit/decorators";
import "../../../../../../components/ha-expansion-panel";
import {
  ConfigEntry,
  getConfigEntries,
} from "../../../../../../data/config_entries";
import { DeviceRegistryEntry } from "../../../../../../data/device_registry";
import {
  fetchZwaveNetworkStatus,
  fetchZwaveNodeStatus,
  controllerStatus,
  nodeStatus,
  SecurityClass,
  subscribeZwaveControllerStatus,
  subscribeZwaveNodeStatus,
  ZWaveJSNodeStatus,
  ZWaveJSController,
} from "../../../../../../data/zwave_js";
import { SubscribeMixin } from "../../../../../../mixins/subscribe-mixin";
import { haStyle } from "../../../../../../resources/styles";
import { HomeAssistant } from "../../../../../../types";

@customElement("ha-device-info-zwave_js")
export class HaDeviceInfoZWaveJS extends SubscribeMixin(LitElement) {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ attribute: false }) public device!: DeviceRegistryEntry;

  @state() private _configEntry?: ConfigEntry;

  @state() private _multipleConfigEntries = false;

  @state() private _node?: ZWaveJSNodeStatus;

  @state() private _controller?: ZWaveJSController;

  public willUpdate(changedProperties: PropertyValues) {
    super.willUpdate(changedProperties);
    if (changedProperties.has("device")) {
      this._fetchNodeDetails();
    }
  }

  public hassSubscribe(): Array<UnsubscribeFunc | Promise<UnsubscribeFunc>> {
    if (this._node?.is_controller_node) {
      return [
        subscribeZwaveControllerStatus(
          this.hass,
          this.device!.id,
          (message) => {
            if (!this._controller) {
              return;
            }
            this._controller = {
              ...this._controller,
              status: message.status,
            };
          }
        ),
      ];
    }
    return [
      subscribeZwaveNodeStatus(this.hass, this.device!.id, (message) => {
        if (!this._node) {
          return;
        }
        this._node = {
          ...this._node,
          status: message.status,
          ready: message.ready,
        };
      }),
    ];
  }

  protected async _fetchNodeDetails() {
    if (!this.device) {
      return;
    }

    const configEntries = await getConfigEntries(this.hass, {
      domain: "zwave_js",
    });

    this._multipleConfigEntries = configEntries.length > 1;

    const configEntry = configEntries.find((entry) =>
      this.device.config_entries.includes(entry.entry_id)
    );

    if (!configEntry) {
      return;
    }

    this._configEntry = configEntry;

    this._node = await fetchZwaveNodeStatus(this.hass, this.device.id);
    if (this._node.is_controller_node) {
      const networkStatus = await fetchZwaveNetworkStatus(this.hass, {
        device_id: this.device.id,
      });
      this._controller = networkStatus.controller;
    }
  }

  protected render() {
    if (!this._node) {
      return nothing;
    }
    return html`
      <ha-expansion-panel
        .header=${this.hass.localize(
          "ui.panel.config.zwave_js.device_info.zwave_info"
        )}
      >
        <div>
          ${this._multipleConfigEntries
            ? html`
                <div>
                  ${this.hass.localize(
                    "ui.panel.config.zwave_js.common.source"
                  )}:
                  ${this._configEntry!.title}
                </div>
              `
            : nothing}
          <div>
            ${this.hass.localize(
              "ui.panel.config.zwave_js.device_info.node_id"
            )}:
            ${this._node.node_id}
          </div>
          <div>
            ${this.hass.localize(
              "ui.panel.config.zwave_js.device_info.node_status"
            )}:
            ${this.hass.localize(
              this._node.is_controller_node
                ? `ui.panel.config.zwave_js.controller_status.${
                    controllerStatus[this._controller!.status]
                  }`
                : `ui.panel.config.zwave_js.node_status.${
                    nodeStatus[this._node.status]
                  }`
            )}
          </div>
          ${!this._node.is_controller_node
            ? html`
                <div>
                  ${this.hass.localize(
                    "ui.panel.config.zwave_js.device_info.node_ready"
                  )}:
                  ${this._node.ready
                    ? this.hass.localize("ui.common.yes")
                    : this.hass.localize("ui.common.no")}
                </div>
                <div>
                  ${this.hass.localize(
                    "ui.panel.config.zwave_js.device_info.highest_security"
                  )}:
                  ${this._node.highest_security_class !== null
                    ? this.hass.localize(
                        `ui.panel.config.zwave_js.security_classes.${
                          SecurityClass[this._node.highest_security_class]
                        }.title`
                      )
                    : this._node.is_secure === false
                    ? this.hass.localize(
                        "ui.panel.config.zwave_js.security_classes.none.title"
                      )
                    : this.hass.localize(
                        "ui.panel.config.zwave_js.device_info.unknown"
                      )}
                </div>
                <div>
                  ${this.hass.localize(
                    "ui.panel.config.zwave_js.device_info.zwave_plus"
                  )}:
                  ${this._node.zwave_plus_version
                    ? this.hass.localize(
                        "ui.panel.config.zwave_js.device_info.zwave_plus_version",
                        "version",
                        this._node.zwave_plus_version
                      )
                    : this.hass.localize("ui.common.no")}
                </div>
              `
            : nothing}
        </div>
      </ha-expansion-panel>
    `;
  }

  static get styles(): CSSResultGroup {
    return [
      haStyle,
      css`
        h4 {
          margin-bottom: 4px;
        }
        div {
          word-break: break-all;
          margin-top: 2px;
        }
        ha-expansion-panel {
          --expansion-panel-summary-padding: 0;
          --expansion-panel-content-padding: 0;
          padding-top: 4px;
        }
      `,
    ];
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-device-info-zwave_js": HaDeviceInfoZWaveJS;
  }
}
