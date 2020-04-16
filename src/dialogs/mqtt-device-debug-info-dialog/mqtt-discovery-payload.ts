import {
  LitElement,
  html,
  TemplateResult,
  customElement,
  property,
} from "lit-element";
import { safeDump } from "js-yaml";

@customElement("mqtt-discovery-payload")
class MQTTDiscoveryPayload extends LitElement {
  @property() public payload!: object;

  @property() public showAsYaml = false;

  @property() public summary!: string;

  @property() private _open = false;

  protected render(): TemplateResult {
    return html`
      <details @toggle=${this._handleToggle}>
        <summary>
          ${this.summary}
        </summary>
        ${this._open ? this._renderPayload() : html``}
      </details>
    `;
  }

  private _renderPayload(): TemplateResult {
    const payload = this.payload;
    return html`
      ${this.showAsYaml
        ? html` <pre>${safeDump(payload)}</pre> `
        : html` <pre>${JSON.stringify(payload, null, 2)}</pre> `}
    `;
  }

  private _handleToggle(ev) {
    this._open = ev.target.open;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "mqtt-discovery-payload": MQTTDiscoveryPayload;
  }
}
