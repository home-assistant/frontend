import {
  html,
  LitElement,
  TemplateResult,
  CSSResult,
  css,
  customElement,
  property,
} from "lit-element";

import "../../../components/ha-icon";

@customElement("hui-warning-element")
export class HuiWarningElement extends LitElement {
  @property() public label?: string;

  protected render(): TemplateResult {
    return html`
      <ha-icon icon="hass:alert" .title="${this.label}"></ha-icon>
    `;
  }

  static get styles(): CSSResult {
    return css`
      ha-icon {
        color: #fce588;
      }
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "hui-warning-element": HuiWarningElement;
  }
}
