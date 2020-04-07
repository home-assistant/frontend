import {
  LitElement,
  css,
  html,
  CSSResult,
  TemplateResult,
  customElement,
  property,
} from "lit-element";
import "../../components/ha-dialog";
import "../../components/ha-switch";
import { computeDeviceName } from "../../data/device_registry";
import { computeStateName } from "../../common/entity/compute_state_name";
import { haStyleDialog } from "../../resources/styles";
// tslint:disable-next-line: no-duplicate-imports
import { HaSwitch } from "../../components/ha-switch";
import { HomeAssistant } from "../../types";
import { MQTTDeviceDebugInfoDialogParams } from "./show-dialog-mqtt-device-debug-info";
import { MQTTDeviceDebugInfo, fetchMQTTDebugInfo } from "../../data/mqtt";
import "./mqtt-messages";
import "./mqtt-discovery-payload";

@customElement("dialog-mqtt-device-debug-info")
class DialogMQTTDeviceDebugInfo extends LitElement {
  public hass!: HomeAssistant;
  @property() private _params?: MQTTDeviceDebugInfoDialogParams;
  @property() private _debugInfo?: MQTTDeviceDebugInfo;
  @property() private _showAsYaml: boolean = true;
  @property() private _showDeserialized: boolean = true;

  public async showDialog(
    params: MQTTDeviceDebugInfoDialogParams
  ): Promise<void> {
    this._params = params;
    fetchMQTTDebugInfo(this.hass, params.device.id).then((results) => {
      this._debugInfo = results;
    });
  }

  protected render(): TemplateResult {
    if (!this._params || !this._debugInfo) {
      return html``;
    }

    return html`
      <ha-dialog
        open
        @closing=${this._close}
        .heading="${this.hass!.localize(
          "ui.dialogs.mqtt_device_debug_info.title",
          "device",
          computeDeviceName(this._params.device, this.hass)
        )}"
      >
        <h4>Payload display</h4>
        <ha-switch
          .checked=${this._showDeserialized}
          @change=${this._showDeserializedChanged}
        >
          ${this.hass!.localize(
            "ui.dialogs.mqtt_device_debug_info.deserialize",
            "format",
            "YAML"
          )}
        </ha-switch>
        <ha-switch
          .checked=${this._showAsYaml}
          @change=${this._showAsYamlChanged}
        >
          ${this.hass!.localize(
            "ui.dialogs.mqtt_device_debug_info.show_as",
            "format",
            "YAML"
          )}
        </ha-switch>
        <h4>Entities</h4>
        <ul>
          ${this._debugInfo.entities.length
            ? this._renderEntities()
            : html`
                ${this.hass!.localize(
                  "ui.dialogs.mqtt_device_debug_info.no_entities"
                )}
              `}
        </ul>
        <h4>Triggers</h4>
        <ul>
          ${this._debugInfo.triggers.length
            ? this._renderTriggers()
            : html`
                ${this.hass!.localize(
                  "ui.dialogs.mqtt_device_debug_info.no_triggers"
                )}
              `}
        </ul>
        <mwc-button slot="primaryAction" @click=${this._close}>
          Close
        </mwc-button>
      </ha-dialog>
    `;
  }

  private _close(): void {
    this._params = undefined;
    this._debugInfo = undefined;
  }

  private _showAsYamlChanged(ev: Event): void {
    this._showAsYaml = (ev.target as HaSwitch).checked;
  }

  private _showDeserializedChanged(ev: Event): void {
    this._showDeserialized = (ev.target as HaSwitch).checked;
  }

  private _renderEntities(): TemplateResult {
    return html`
      ${this._debugInfo!.entities.map(
        (entity) => html`
          <li>
            '${computeStateName(this.hass.states[entity.entity_id])}'
            (<code>${entity.entity_id}</code>)
            <br />MQTT discovery data:
            <ul>
              <li>
                Topic:
                <code>${entity.discovery_data.topic}</code>
              </li>
              <li>
                <mqtt-discovery-payload
                  .hass=${this.hass}
                  .payload=${entity.discovery_data.payload}
                  .showAsYaml=${this._showAsYaml}
                  .summary=${"Payload"}
                >
                </mqtt-discovery-payload>
              </li>
            </ul>
            Subscribed topics:
            <ul>
              ${entity.subscriptions.map(
                (topic) => html`
                  <li>
                    <code>${topic.topic}</code>
                    <mqtt-messages
                      .hass=${this.hass}
                      .messages=${topic.messages}
                      .showDeserialized=${this._showDeserialized}
                      .showAsYaml=${this._showAsYaml}
                      .subscribedTopic=${topic.topic}
                      .summary=${this.hass!.localize(
                        "ui.dialogs.mqtt_device_debug_info.recent_messages",
                        "n",
                        topic.messages.length
                      )}
                    >
                    </mqtt-messages>
                  </li>
                `
              )}
            </ul>
          </li>
        `
      )}
    `;
  }

  private _renderTriggers(): TemplateResult {
    return html`
      ${this._debugInfo!.triggers.map(
        (trigger) => html`
          <li>
            Discovery topic:
            <code>${trigger.discovery_data.topic}</code>
            <mqtt-discovery-payload
              .hass=${this.hass}
              .payload=${trigger.discovery_data.payload}
              .showAsYaml=${this._showAsYaml}
              .summary=${"Discovery payload"}
            >
            </mqtt-discovery-payload>
          </li>
        `
      )}
    `;
  }

  static get styles(): CSSResult[] {
    return [
      haStyleDialog,
      css`
        ha-dialog {
          --mdc-dialog-max-width: 95%;
          --mdc-dialog-min-width: 640px;
        }
        ha-switch {
          margin: 16px;
        }
      `,
    ];
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "dialog-mqtt-device-debug-info": DialogMQTTDeviceDebugInfo;
  }
}
