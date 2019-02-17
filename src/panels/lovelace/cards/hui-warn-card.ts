import {
  html,
  LitElement,
  TemplateResult,
  property,
  CSSResult,
  css,
} from "lit-element";

export class HuiWarnCard extends LitElement {
  @property() public warning?: string;
  @property() public entity?: string;

  public getCardSize(): number {
    return 1;
  }

  protected render(): TemplateResult | void {
    return html`
      ${this.warning || "Entity not available"}: ${this.entity || ""}
    `;
  }

  static get styles(): CSSResult {
    return css`
      :host {
        display: block;
        color: black;
        background-color: yellow;
        padding: 8px;
      }
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "hui-warn-card": HuiWarnCard;
  }
}

customElements.define("hui-warn-card", HuiWarnCard);
