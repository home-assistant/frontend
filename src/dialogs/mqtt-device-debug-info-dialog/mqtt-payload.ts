import {
  LitElement,
  html,
  TemplateResult,
  customElement,
  property,
} from "lit-element";
import { safeDump } from "js-yaml";

@customElement("mqtt-payload")
class MQTTPayload extends LitElement {
  @property() public payload?: object | string;
  @property() public _showAsYaml: boolean = false;
  @property() public _showDeserialized: boolean = false;
  @property() private _payloadJson?: object;

  protected firstUpdated() {
    let o = this.payload;

    // If the payload is a string, determine if the payload is valid JSON and if it
    // is, assign the object representation to this._payloadJson.
    if (typeof this.payload === "string") {
      try {
        o = JSON.parse(this.payload);
      } catch (e) {
        return;
      }
    } else {
      this._showDeserialized = true;
    }
    // Handle non-exception-throwing cases:
    // Neither JSON.parse(false) or JSON.parse(1234) throw errors, hence the type-checking,
    // but... JSON.parse(null) returns null, and typeof null === "object",
    // so we must check for that, too. Thankfully, null is falsey, so this suffices:
    if (o && typeof o === "object") {
      this._payloadJson = o;
    }
  }

  protected render(): TemplateResult {
    return this._payloadJson && this._showDeserialized
      ? html`
          ${this._showAsYaml
            ? html`
                <pre>${safeDump(this._payloadJson)}</pre>
              `
            : html`
                <pre>${JSON.stringify(this._payloadJson, null, 2)}</pre>
              `}
        `
      : html`
          <code>${this.payload}</code>
        `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "mqtt-payload": MQTTPayload;
  }
}
