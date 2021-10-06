import "@material/mwc-list/mwc-list-item";
import { css, html, LitElement, TemplateResult } from "lit";
import { customElement, property } from "lit/decorators";

@customElement("ha-overflow-menu-item")
export class HaOverflowMenuItem extends LitElement {
  @property({ attribute: false }) public label;

  protected render(): TemplateResult {
    return html`
      <mwc-list-item graphic="icon">
        <div slot="graphic">
          <slot></slot>
        </div>
        ${this.label}
      </mwc-list-item>
    `;
  }

  static get styles(): CSSResultGroup {
    return css`
      ::slotted .mdc-icon-button {
        color: #f99 !important;
      }
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-overflow-menu-item": HaOverflowMenuItem;
  }
}
