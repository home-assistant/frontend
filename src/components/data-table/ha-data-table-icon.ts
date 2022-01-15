import "@polymer/paper-tooltip/paper-tooltip";
import { css, html, LitElement, TemplateResult } from "lit";
import { customElement, property } from "lit/decorators";
import "../ha-svg-icon";

@customElement("ha-data-table-icon")
class HaDataTableIcon extends LitElement {
  @property() public tooltip!: string;

  @property() public path!: string;

  protected render(): TemplateResult {
    return html`
      <ha-svg-icon .path=${this.path}></ha-svg-icon>
      <paper-tooltip animation-delay="0" position="left"
        >${this.tooltip}</paper-tooltip
      >
    `;
  }

  static get styles() {
    return css`
      :host {
        display: inline-block;
      }
      ha-svg-icon {
        color: var(--secondary-text-color);
      }
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-data-table-icon": HaDataTableIcon;
  }
}
