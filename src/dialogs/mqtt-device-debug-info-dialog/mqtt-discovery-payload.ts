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
      ${this._open
        ? html` <div class="payload">
            ${this._renderPayload()}
          </div>`
        : ""}
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
      .payload {
        border: 1px solid var(--divider-color);
        border-top: 0;
        padding-left: 16px;
      }
      pre {
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
