import { css, html, LitElement } from "lit";
import { customElement, property } from "lit/decorators";
import { ifDefined } from "lit/directives/if-defined";

type HeadingBadgeType = "text" | "button";

@customElement("ha-heading-badge")
export class HaBadge extends LitElement {
  @property() public type: HeadingBadgeType = "text";

  protected render() {
    return html`
      <div
        class="heading-badge"
        role=${ifDefined(this.type === "button" ? "button" : undefined)}
        tabindex=${ifDefined(this.type === "button" ? "0" : undefined)}
      >
        <slot name="icon"></slot>
        <slot></slot>
      </div>
    `;
  }

  static styles = css`
    :host {
    }
    [role="button"] {
      cursor: pointer;
    }
    .heading-badge {
      display: flex;
      flex-direction: row;
      white-space: nowrap;
      align-items: center;
      gap: 3px;
      color: var(--ha-heading-badge-text-color, var(--secondary-text-color));
      font-size: var(--ha-heading-badge-font-size, var(--ha-font-size-m));
      font-weight: var(--ha-heading-badge-font-weight, 400);
      line-height: var(--ha-heading-badge-line-height, 20px);
      letter-spacing: 0.1px;
      --mdc-icon-size: 14px;
    }
    ::slotted([slot="icon"]) {
      --ha-icon-display: block;
      color: var(--icon-color, inherit);
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-heading-badge": HaBadge;
  }
}
