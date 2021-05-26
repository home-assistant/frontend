import { css, CSSResultGroup, html, LitElement, TemplateResult } from "lit";
import { customElement, property } from "lit/decorators";
import "../../../components/ha-icon";

@customElement("hui-warning-element")
export class HuiWarningElement extends LitElement {
  @property() public label?: string;

  protected render(): TemplateResult {
    return html` <ha-icon icon="hass:alert" .title=${this.label}></ha-icon> `;
  }

  static get styles(): CSSResultGroup {
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
