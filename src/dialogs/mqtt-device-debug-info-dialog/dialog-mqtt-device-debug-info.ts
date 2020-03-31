import {
  LitElement,
  html,
  CSSResult,
  TemplateResult,
  customElement,
  property,
} from "lit-element";
import { safeDump } from "js-yaml";
import { computeDeviceName } from "../../data/device_registry";
import { computeStateName } from "../../common/entity/compute_state_name";
import "../../components/ha-dialog";
import { haStyleDialog } from "../../resources/styles";
import { HomeAssistant } from "../../types";
import { MQTTDeviceDebugInfoDialogParams } from "./show-dialog-mqtt-device-debug-info";
import { MQTTDeviceDebugInfo, fetchMQTTDebugInfo } from "../../data/mqtt";

function tryParseJSON(jsonString) {
  try {
    const o = JSON.parse(jsonString);

    // Handle non-exception-throwing cases:
    // Neither JSON.parse(false) or JSON.parse(1234) throw errors, hence the type-checking,
    // but... JSON.parse(null) returns null, and typeof null === "object",
    // so we must check for that, too. Thankfully, null is falsey, so this suffices:
    if (o && typeof o === "object") {
      return o;
    }
  } catch (e) {
    return false;
  }

  return false;
}

@customElement("dialog-mqtt-device-debug-info")
class DialogMQTTDeviceDebugInfo extends LitElement {
  @property() public hass!: HomeAssistant;
  @property() private _params?: MQTTDeviceDebugInfoDialogParams;
  @property() private _debugInfo?: MQTTDeviceDebugInfo;

  public async showDialog(
    params: MQTTDeviceDebugInfoDialogParams
  ): Promise<void> {
    this._params = params;
    this._debugInfo = await fetchMQTTDebugInfo(this.hass, params.device.id);
    await this.updateComplete;
  }

  protected render(): TemplateResult {
    if (!this._params || !this._debugInfo) {
      return html``;
    }

    return html`
      <ha-dialog
        open
        @closing="${this._close}"
        .heading="${computeDeviceName(
          this._params.device,
          this.hass
        )} debug info"
      >
        Entities
        <ul>
          ${this._debugInfo.entities.length
            ? html`
                ${this._debugInfo.entities.map(
                  (entity) => html`
                    <li>
                      '${computeStateName(this.hass.states[entity.entity_id])}'
                      (<code>${entity.entity_id}</code>)
                      <br />Discovery topic:
                      <code>${entity.discovery_data.discovery_topic}</code>
                      <details>
                        <summary>
                          Discovery payload (JSON)
                        </summary>
                        <pre>
      ${JSON.stringify(entity.discovery_data.discovery_payload, null, 2)}</pre
                        >
                      </details>
                      <details>
                        <summary>
                          Discovery payload (YAML)
                        </summary>
                        <pre>
      ${safeDump(entity.discovery_data.discovery_payload)}</pre
                        >
                      </details>
                      Subscribed topics
                      <ul>
                        ${entity.topics.map(
                          (topic) => html`
                            <li>
                              <code>${topic.topic}</code>
                              <details>
                                <summary>
                                  ${topic.messages.length} most recent received
                                  message(s)
                                </summary>
                                <ul>
                                  ${topic.messages.map(
                                    (message) => html`
                                      <li>
                                        ${tryParseJSON(message)
                                          ? html`
                                              <pre>
      ${safeDump(JSON.parse(message))}</pre
                                              >
                                            `
                                          : html`
                                              <code>${message}</code>
                                            `}
                                      </li>
                                    `
                                  )}
                                </ul>
                              </details>
                            </li>
                          `
                        )}
                      </ul>
                    </li>
                  `
                )}
              `
            : html`
                &lt;No entities&gt;
              `}
        </ul>
        Triggers
        <ul>
          ${this._debugInfo.triggers.length
            ? html`
                ${this._debugInfo.triggers.map(
                  (trigger) => html`
                    <li>
                      Discovery topic:
                      <code>${trigger.discovery_data.discovery_topic}</code>
                      <details>
                        <summary>
                          Discovery payload (JSON)
                        </summary>
                        <pre>
      ${JSON.stringify(trigger.discovery_data.discovery_payload, null, 2)}</pre
                        >
                      </details>
                      <details>
                        <summary>
                          Discovery payload (YAML)
                        </summary>
                        <pre>
      ${safeDump(trigger.discovery_data.discovery_payload)}</pre
                        >
                      </details>
                    </li>
                  `
                )}
              `
            : html`
                &lt;No triggers&gt;
              `}
        </ul>
      </ha-dialog>
    `;
  }

  private _close(): void {
    this._params = undefined;
  }

  static get styles(): CSSResult[] {
    return [haStyleDialog];
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "dialog-mqtt-device-debug-info": DialogMQTTDeviceDebugInfo;
  }
}
