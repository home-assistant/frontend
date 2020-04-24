import { safeDump } from "js-yaml";
import {
  customElement,
  html,
  LitElement,
  property,
  TemplateResult,
} from "lit-element";
import { MQTTMessage } from "../../data/mqtt";

@customElement("mqtt-messages")
class MQTTMessages extends LitElement {
  @property() public messages!: MQTTMessage[];

  @property() public showAsYaml = false;

  @property() public showDeserialized = false;

  @property() public subscribedTopic!: string;

  @property() public summary!: string;

  @property() private _open = false;

  @property() private _payloadsJson = new WeakMap();

  @property() private _showTopic = false;

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
      <details @toggle=${this._handleToggle}>
        <summary>
          ${this.summary}
        </summary>
        ${this._open
          ? html`
              <ul>
                ${this.messages.map(
                  (message) => html`
                    <li>
                      ${this._renderSingleMessage(message)}
                    </li>
                  `
                )}
              </ul>
            `
          : ""}
      </details>
    `;
  }

  private _renderSingleMessage(message): TemplateResult {
    const topic = message.topic;
    return this._showTopic
      ? html`
          <ul>
            <li>
              Topic: ${topic}
            </li>
            <li>
              Payload: ${this._renderSinglePayload(message)}
            </li>
          </ul>
        `
      : this._renderSinglePayload(message);
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

  private _handleToggle(ev) {
    this._open = ev.target.open;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "mqtt-messages": MQTTMessages;
  }
}
