import "@material/mwc-list/mwc-list-item";
import { css, html, LitElement, TemplateResult } from "lit";
import { customElement, property } from "lit/decorators";

@customElement("ha-overflow-menu-item")
export class HaOverflowMenuItem extends LitElement {
  @property({ attribute: false }) public label;

  @property({ attribute: false }) public path;

  @property({ attribute: false }) public disabled;

  protected render(): TemplateResult {
    return html`
      <mwc-list-item graphic="icon" .disabled=${this.disabled}>
        <div slot="graphic">
          <ha-svg-icon .path=${this.path}></ha-svg-icon>
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
