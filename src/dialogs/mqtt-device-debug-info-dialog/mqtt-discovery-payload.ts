import { safeDump } from "js-yaml";
import {
  css,
  CSSResult,
  customElement,
  html,
  LitElement,
  property,
  TemplateResult,
} from "lit-element";
import { classMap } from "lit-html/directives/class-map";

@customElement("mqtt-discovery-payload")
class MQTTDiscoveryPayload extends LitElement {
  @property() public payload!: object;

  @property() public showAsYaml = false;

  @property() public summary!: string;

  @property() private _open = false;

  protected render(): TemplateResult {
    return html`
      <div
        class="expander ${classMap({ open: this._open })}"
        @click=${this._handleToggle}
      >
        ${this.summary}
      </div>
      <div class="payload">
        ${this._open ? this._renderPayload() : ""}
      </div>
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

  private _handleToggle() {
    this._open = !this._open;
  }

  static get styles(): CSSResult {
    return css`
      .expander {
        position: relative;
        padding-left: 16px;
      }
      .expander:before {
        content: "";
        position: absolute;
        border-right: 2px solid var(--primary-text-color);
        border-bottom: 2px solid var(--primary-text-color);
        width: 5px;
        height: 5px;
        top: calc(50% - 2px);
        left: -0px;
        transform: translateY(-50%) rotate(-45deg);
      }
      .expander.open:before {
        transform: translateY(-50%) rotate(45deg);
      }
      .payload {
        padding-left: 16px;
      }
      pre {
        background-color: var(--secondary-background-color);
        display: inline-block;
        font-size: 0.9em;
        padding-left: 4px;
        padding-right: 4px;
      }
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "mqtt-discovery-payload": MQTTDiscoveryPayload;
  }
}
