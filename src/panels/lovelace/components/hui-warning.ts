import {
  html,
  LitElement,
  TemplateResult,
  CSSResult,
  css,
  customElement,
} from "lit-element";

@customElement("hui-warning")
export class HuiWarning extends LitElement {
  public getCardSize(): number {
    return 1;
  }

  protected render(): TemplateResult | void {
    return html`
      <slot></slot>
    `;
  }

  static get styles(): CSSResult {
    return css`
      :host {
        display: block;
        color: black;
        background-color: #fce588;
        padding: 8px;
      }
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "hui-warning": HuiWarning;
  }
}
