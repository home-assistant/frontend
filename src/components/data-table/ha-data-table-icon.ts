import type { TemplateResult } from "lit";
import { css, html, LitElement } from "lit";
import { customElement, property } from "lit/decorators";
import "../ha-svg-icon";
import "../ha-tooltip";

@customElement("ha-data-table-icon")
class HaDataTableIcon extends LitElement {
  @property() public tooltip!: string;

  @property() public path!: string;

  protected render(): TemplateResult {
    return html`
      <ha-tooltip .content=${this.tooltip}>
        <ha-svg-icon .path=${this.path}></ha-svg-icon>
      </ha-tooltip>
    `;
  }

  static styles = css`
    :host {
      display: inline-block;
      position: relative;
    }
    ha-svg-icon {
      color: var(--secondary-text-color);
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-data-table-icon": HaDataTableIcon;
  }
}
