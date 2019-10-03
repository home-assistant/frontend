import {
  css,
  CSSResult,
  customElement,
  html,
  LitElement,
  TemplateResult,
} from "lit-element";
import "../ha-label-badge";

@customElement("ha-badge-group")
export class HaBadgeGroup extends LitElement {
  protected render(): TemplateResult | void {
    return html`
      <slot></slot>
    `;
  }

  static get styles(): CSSResult {
    return css`
      :host {
        display: block;
        margin: 8px 16px;
        font-size: 85%;
        text-align: center;
      }
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-badge-group": HaBadgeGroup;
  }
}
