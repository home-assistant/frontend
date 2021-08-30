import { mdiAlertOutline } from "@mdi/js";
import { css, CSSResultGroup, html, LitElement, TemplateResult } from "lit";
import { customElement, property } from "lit/decorators";
import "../../../components/ha-svg-icon";

@customElement("hui-warning-element")
export class HuiWarningElement extends LitElement {
  @property() public label?: string;

  protected render(): TemplateResult {
    return html`
      <ha-svg-icon .path=${mdiAlertOutline} .title=${this.label}></ha-svg-icon>
    `;
  }

  static get styles(): CSSResultGroup {
    return css`
      ha-svg-icon {
        color: var(--warning-color);
      }
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "hui-warning-element": HuiWarningElement;
  }
}
