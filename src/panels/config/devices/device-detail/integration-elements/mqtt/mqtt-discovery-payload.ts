import { dump } from "js-yaml";
import type { TemplateResult } from "lit";
import { css, html, LitElement } from "lit";
import { customElement, property, state } from "lit/decorators";
import { classMap } from "lit/directives/class-map";

@customElement("mqtt-discovery-payload")
class MQTTDiscoveryPayload extends LitElement {
  @property({ attribute: false }) public payload!: Record<string, unknown>;

  @property({ attribute: "show-as-yaml", type: Boolean })
  public showAsYaml = false;

  @property() public summary!: string;

  @state() private _open = false;

  protected render(): TemplateResult {
    return html`
      <div
        class="expander ${classMap({ open: this._open })}"
        @click=${this._handleToggle}
      >
        ${this.summary}
      </div>
      ${this._open
        ? html` <div class="payload">${this._renderPayload()}</div>`
        : ""}
    `;
  }

  private _renderPayload(): TemplateResult {
    const payload = this.payload;
    return html`
      ${this.showAsYaml
        ? html` <pre>${dump(payload)}</pre> `
        : html` <pre>${JSON.stringify(payload, null, 2)}</pre> `}
    `;
  }

  private _handleToggle() {
    this._open = !this._open;
  }

  static styles = css`
    .expander {
      cursor: pointer;
      position: relative;
      padding: 8px;
      padding-left: 29px;
      padding-inline-start: 29px;
      padding-inline-end: initial;
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
      padding-inline-start: 16px;
      padding-inline-end: initial;
    }
    pre {
      display: inline-block;
      font-size: 0.9em;
      padding-left: 4px;
      padding-right: 4px;
      padding-inline-start: 4px;
      padding-inline-end: 4px;
      font-family: var(--ha-font-family-code);
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    "mqtt-discovery-payload": MQTTDiscoveryPayload;
  }
}
