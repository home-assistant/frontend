import { css, CSSResultGroup, html, LitElement, TemplateResult } from "lit";
import { customElement, property } from "lit/decorators";
import "../ha-icon";

@customElement("ha-tile-badge")
export class HaTileBadge extends LitElement {
  @property() public iconPath?: string;

  @property() public icon?: string;

  protected render(): TemplateResult {
    return html`
      <div class="badge">
        ${this.icon
          ? html`<ha-icon .icon=${this.icon}></ha-icon>`
          : html`<ha-svg-icon .path=${this.iconPath}></ha-svg-icon>`}
      </div>
    `;
  }

  static get styles(): CSSResultGroup {
    return css`
      :host {
        --tile-badge-background-color: var(--primary-color);
        --tile-badge-icon-color: var(--white-color);
        --mdc-icon-size: 12px;
      }
      .badge {
        display: flex;
        align-items: center;
        justify-content: center;
        line-height: 0;
        width: 16px;
        height: 16px;
        border-radius: 8px;
        background-color: var(--tile-badge-background-color);
        transition: background-color 280ms ease-in-out;
      }
      .badge ha-icon,
      .badge ha-svg-icon {
        color: var(--tile-badge-icon-color);
      }
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-tile-badge": HaTileBadge;
  }
}
