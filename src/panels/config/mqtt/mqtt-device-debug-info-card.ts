import "../../../components/buttons/ha-call-service-button";
import "../../../components/ha-service-description";
import "../../../components/entity/state-badge";
import "../../../components/ha-card";
import "@material/mwc-button";
import "@polymer/paper-dropdown-menu/paper-dropdown-menu";
import "@polymer/paper-input/paper-input";
import "@polymer/paper-item/paper-icon-item";
import "@polymer/paper-item/paper-item";
import "@polymer/paper-item/paper-item-body";
import "@polymer/paper-listbox/paper-listbox";

import {
  css,
  CSSResult,
  customElement,
  html,
  LitElement,
  property,
  TemplateResult,
} from "lit-element";

import { safeDump } from "js-yaml";
import { haStyle } from "../../../resources/styles";
import { HomeAssistant } from "../../../types";
import { computeStateName } from "../../../common/entity/compute_state_name";
import { MQTTDeviceDebugInfo } from "../../../data/mqtt";

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

@customElement("mqtt-device-debug-info-card")
class MQTTDeviceDebugInfoCard extends LitElement {
  @property() public hass!: HomeAssistant;
  @property() public debugInfo?: MQTTDeviceDebugInfo;

  protected render(): TemplateResult {
    return html`
      <ha-card header="Lab">
        <div class="card-content">
          ${this.debugInfo && this.debugInfo.entities.length > 0
            ? html`
                Entities
                <ul>
                  ${this.debugInfo.entities.map(
                    (entity) => html`
                      <li>
                        '${computeStateName(
                          this.hass.states[entity.entity_id]
                        )}'
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
                                    ${topic.messages.length} most recent
                                    received message(s)
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
                </ul>
                Triggers
                <ul>
                  ${this.debugInfo.triggers.map(
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
                </ul>
              `
            : ""}
        </div>
      </ha-card>
    `;
  }

  static get styles(): CSSResult[] {
    return [
      haStyle,
      css`
        ha-card {
          flex: 1 0 100%;
          padding-bottom: 10px;
          min-width: 300px;
        }
      `,
    ];
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "mqtt-device-debug-info-card": MQTTDeviceDebugInfoCard;
  }
}
