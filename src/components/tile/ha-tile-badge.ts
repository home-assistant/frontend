import { css, CSSResultGroup, html, LitElement, TemplateResult } from "lit";
import { customElement } from "lit/decorators";
import "../ha-icon";

@customElement("ha-tile-badge")
export class HaTileBadge extends LitElement {
  protected render(): TemplateResult {
    return html`
      <div class="badge">
        <slot></slot>
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
      .badge ::slotted(*) {
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
