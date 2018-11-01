import { html, LitElement } from "@polymer/lit-element";
import { TemplateResult } from "lit-html";

class HuiErrorEntityRow extends LitElement {
  public entity?: string;

  static get properties() {
    return {
      entity: {},
    };
  }

  protected render(): TemplateResult {
    if (!this.entity) {
      return html``;
    }

    return html`
      ${this.renderStyle()}
      <div>
        Entity not available: ${this.entity}
      </div>
    `;
  }

  private renderStyle(): TemplateResult {
    return html`
      <style>
        div {
          flex: 1;
          background-color: yellow;
          padding: 8px;
        }
      </style>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "hui-error-entity-row": HuiErrorEntityRow;
  }
}

customElements.define("hui-error-entity-row", HuiErrorEntityRow);
