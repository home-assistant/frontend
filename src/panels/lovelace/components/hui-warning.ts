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
  protected render(): TemplateResult {
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
