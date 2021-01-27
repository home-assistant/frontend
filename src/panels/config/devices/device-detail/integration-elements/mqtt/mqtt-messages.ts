import { safeDump } from "js-yaml";
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
import { classMap } from "lit-html/directives/class-map";
import { formatTimeWithSeconds } from "../../../../../../common/datetime/format_time";
import { MQTTMessage } from "../../../../../../data/mqtt";
import { HomeAssistant } from "../../../../../../types";

@customElement("mqtt-messages")
class MQTTMessages extends LitElement {
  public hass!: HomeAssistant;

  @property() public messages!: MQTTMessage[];

  @property() public showAsYaml = false;

  @property() public showDeserialized = false;

  @property() public subscribedTopic!: string;

  @property() public summary!: string;

  @internalProperty() private _open = false;

  @internalProperty() private _payloadsJson = new WeakMap();

  @internalProperty() private _showTopic = false;

  protected firstUpdated(): void {
    this.messages.forEach((message) => {
      // If any message's topic differs from the subscribed topic, show topics + payload
      if (this.subscribedTopic !== message.topic) {
        this._showTopic = true;
      }
    });
  }

  protected render(): TemplateResult {
    return html`
      <div
        class="expander ${classMap({ open: this._open })}"
        @click=${this._handleToggle}
      >
        ${this.summary}
      </div>
      ${this._open
        ? html`
            <ul class="message-list">
              ${this.messages.map(
                (message) => html`
                  <li class="message">
                    <div class="time">
                      Received
                      ${formatTimeWithSeconds(
                        new Date(message.time),
                        this.hass.language
                      )}
                    </div>
                    ${this._renderSingleMessage(message)}
                  </li>
                `
              )}
            </ul>
          `
        : ""}
    `;
  }

  private _renderSingleMessage(message): TemplateResult {
    const topic = message.topic;
    return html`
      <ul class="message-with-topic">
        ${this._showTopic ? html` <li>Topic: <code>${topic}</code></li> ` : ""}
        <li>QoS: ${message.qos}${message.retain ? ", Retained" : ""}</li>
        <li>
          Payload: ${this._renderSinglePayload(message)}
        </li>
      </ul>
    `;
  }

  private _renderSinglePayload(message): TemplateResult {
    let json;

    if (this.showDeserialized) {
      if (!this._payloadsJson.has(message)) {
        json = this._tryParseJson(message.payload);
        this._payloadsJson.set(message, json);
      } else {
        json = this._payloadsJson.get(message);
      }
    }

    return json
      ? html`
          ${this.showAsYaml
            ? html` <pre>${safeDump(json)}</pre> `
            : html` <pre>${JSON.stringify(json, null, 2)}</pre> `}
        `
      : html` <code>${message.payload}</code> `;
  }

  private _tryParseJson(payload) {
    let jsonPayload = null;
    let o = payload;

    // If the payload is a string, determine if the payload is valid JSON and if it
    // is, assign the object representation to this._payloadJson.
    if (typeof payload === "string") {
      try {
        o = JSON.parse(payload);
      } catch (e) {
        o = null;
      }
    }
    // Handle non-exception-throwing cases:
    // Neither JSON.parse(false) or JSON.parse(1234) throw errors, hence the type-checking,
    // but... JSON.parse(null) returns null, and typeof null === "object",
    // so we must check for that, too. Thankfully, null is falsey, so this suffices:
    if (o && typeof o === "object") {
      jsonPayload = o;
    }
    return jsonPayload;
  }

  private _handleToggle() {
    this._open = !this._open;
  }

  static get styles(): CSSResult {
    return css`
      .expander {
        cursor: pointer;
        position: relative;
        padding: 8px;
        padding-left: 29px;
        border: 1px solid var(--divider-color);
      }
      .expander:before {
        content: "";
        position: absolute;
        border-right: 2px solid var(--primary-text-color);
        border-bottom: 2px solid var(--primary-text-color);
        width: 5px;
        height: 5px;
        top: 50%;
        left: 12px;
        transform: translateY(-50%) rotate(-45deg);
      }
      .expander.open:before {
        transform: translateY(-50%) rotate(45deg);
      }
      .message {
        font-size: 0.9em;
        margin-bottom: 12px;
      }
      .message-list {
        border: 1px solid var(--divider-color);
        border-top: 0;
        padding-left: 28px;
        margin: 0;
      }
      pre {
        display: inline-block;
        font-size: 0.9em;
        margin: 0;
        padding-left: 4px;
        padding-right: 4px;
        font-family: var(--code-font-family, monospace);
      }
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "mqtt-messages": MQTTMessages;
  }
}
