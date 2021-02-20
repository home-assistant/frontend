import "@material/mwc-button/mwc-button";
import {
  css,
  CSSResult,
  customElement,
  html,
  internalProperty,
  LitElement,
  TemplateResult,
} from "lit-element";
import { computeStateName } from "../../../../../../common/entity/compute_state_name";
import { computeRTLDirection } from "../../../../../../common/util/compute_rtl";
import "../../../../../../components/ha-dialog";
import "../../../../../../components/ha-formfield";
import "../../../../../../components/ha-switch";
import type { HaSwitch } from "../../../../../../components/ha-switch";
import { computeDeviceName } from "../../../../../../data/device_registry";
import {
  fetchMQTTDebugInfo,
  MQTTDeviceDebugInfo,
} from "../../../../../../data/mqtt";
import { haStyleDialog } from "../../../../../../resources/styles";
import { HomeAssistant } from "../../../../../../types";
import "./mqtt-discovery-payload";
import "./mqtt-messages";
import { MQTTDeviceDebugInfoDialogParams } from "./show-dialog-mqtt-device-debug-info";

@customElement("dialog-mqtt-device-debug-info")
class DialogMQTTDeviceDebugInfo extends LitElement {
  public hass!: HomeAssistant;

  @internalProperty() private _params?: MQTTDeviceDebugInfoDialogParams;

  @internalProperty() private _debugInfo?: MQTTDeviceDebugInfo;

  @internalProperty() private _showAsYaml = true;

  @internalProperty() private _showDeserialized = true;

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

    const dir = computeRTLDirection(this.hass!);

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
        <h4>
          ${this.hass!.localize(
            "ui.dialogs.mqtt_device_debug_info.payload_display"
          )}
        </h4>
        <div>
          <ha-formfield
            .label=${this.hass!.localize(
              "ui.dialogs.mqtt_device_debug_info.deserialize"
            )}
            .dir=${dir}
          >
            <ha-switch
              .checked=${this._showDeserialized}
              @change=${this._showDeserializedChanged}
            >
            </ha-switch>
          </ha-formfield>
        </div>
        <div>
          <ha-formfield
            .label=${this.hass!.localize(
              "ui.dialogs.mqtt_device_debug_info.show_as_yaml"
            )}
            .dir=${dir}
          >
            <ha-switch
              .checked=${this._showAsYaml}
              @change=${this._showAsYamlChanged}
            >
            </ha-switch>
          </ha-formfield>
        </div>
        <h4>
          ${this.hass!.localize("ui.dialogs.mqtt_device_debug_info.entities")}
        </h4>
        <ul class="entitylist">
          ${this._debugInfo.entities.length
            ? this._renderEntities()
            : html`
                ${this.hass!.localize(
                  "ui.dialogs.mqtt_device_debug_info.no_entities"
                )}
              `}
        </ul>
        <h4>
          ${this.hass!.localize("ui.dialogs.mqtt_device_debug_info.triggers")}
        </h4>
        <ul class="triggerlist">
          ${this._debugInfo.triggers.length
            ? this._renderTriggers()
            : html`
                ${this.hass!.localize(
                  "ui.dialogs.mqtt_device_debug_info.no_triggers"
                )}
              `}
        </ul>
        <mwc-button slot="primaryAction" @click=${this._close}>
          ${this.hass!.localize("ui.dialogs.generic.close")}
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
          <li class="entitylistitem">
            '${computeStateName(this.hass.states[entity.entity_id])}'
            (<code>${entity.entity_id}</code>)
            <br />MQTT discovery data:
            <ul class="discoverydata">
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
          <li class="triggerlistitem">
            MQTT discovery data:
            <ul class="discoverydata">
              <li>
                Topic:
                <code>${trigger.discovery_data.topic}</code>
              </li>
              <li>
                <mqtt-discovery-payload
                  .hass=${this.hass}
                  .payload=${trigger.discovery_data.payload}
                  .showAsYaml=${this._showAsYaml}
                  .summary=${"Payload"}
                >
                </mqtt-discovery-payload>
              </li>
            </ul>
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
        .discoverydata {
          list-style-type: none;
          margin: 4px;
          padding-left: 16px;
        }
        .entitylistitem {
          margin-bottom: 12px;
        }
        .triggerlistitem {
          margin-bottom: 12px;
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
