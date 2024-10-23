import type { CSSResultGroup } from "lit";
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

  static get styles(): CSSResultGroup {
    return css`
      :host {
        color: var(--secondary-text-color);
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
        font-family: Roboto;
        font-size: 14px;
        font-style: normal;
        font-weight: 400;
        line-height: 20px;
        letter-spacing: 0.1px;
        --mdc-icon-size: 14px;
      }
      ::slotted([slot="icon"]) {
        --ha-icon-display: block;
        color: var(--icon-color, inherit);
      }
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-heading-badge": HaBadge;
  }
}
