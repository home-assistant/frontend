import {
  LitElement,
  html,
  TemplateResult,
  customElement,
  property,
} from "lit-element";
import { safeDump } from "js-yaml";
import { MQTTMessage } from "../../data/mqtt";

@customElement("mqtt-messages")
class MQTTMessages extends LitElement {
  @property() public messages!: MQTTMessage[];

  @property() public showAsYaml = false;

  @property() public showDeserialized = false;

  @property() public subscribedTopic!: string;

  @property() public summary!: string;

  @property() private _open = false;

  @property() private _payloadsJson!: Array<object | null | undefined>;

  @property() private _showTopic = false;

  protected firstUpdated(): void {
    this._payloadsJson = new Array(this.messages.length);
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
                  (_, i) => html`
                    <li>
                      ${this._renderSingleMessage(i)}
                    </li>
                  `
                )}
              </ul>
            `
          : html``}
      </details>
    `;
  }

  private _renderSingleMessage(i: number): TemplateResult {
    const topic = this.messages[i].topic;
    return this._showTopic
      ? html`
          <ul>
            <li>
              Topic: ${topic}
            </li>
            <li>
              Payload: ${this._renderSinglePayload(i)}
            </li>
          </ul>
        `
      : this._renderSinglePayload(i);
  }

  private _renderSinglePayload(i: number): TemplateResult {
    if (this._payloadsJson && this._payloadsJson[i] === undefined) {
      this._payloadsJson[i] = this._tryParseJson(this.messages[i].payload);
    }

    return this._payloadsJson && this._payloadsJson[i] && this.showDeserialized
      ? html`
          ${this.showAsYaml
            ? html` <pre>${safeDump(this._payloadsJson[i])}</pre> `
            : html`
                <pre>${JSON.stringify(this._payloadsJson[i], null, 2)}</pre>
              `}
        `
      : html` <code>${this.messages[i].payload}</code> `;
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
