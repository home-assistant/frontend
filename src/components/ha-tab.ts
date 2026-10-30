import type { TemplateResult } from "lit";
import { css, html, LitElement, nothing } from "lit";
import { customElement, property } from "lit/decorators";
import "./ha-ripple";

@customElement("ha-tab")
export class HaTab extends LitElement {
  @property({ type: Boolean, reflect: true }) public active = false;

  @property({ type: Boolean, reflect: true }) public narrow = false;

  @property() public name?: string;

  // A short note next to the name, like how many updates wait there
  @property() public badge?: string;

  protected render(): TemplateResult {
    return html`
      <div>
        <span class="content">
          <span class="icon">
            <slot name="icon"></slot>
            ${
              this.badge && this.narrow
                ? html`<span class="dot"></span>`
                : nothing
            }
          </span>
          <span class="name">${this.name}</span>
          ${
            this.badge
              ? html`<span class="badge">${this.badge}</span>`
              : nothing
          }
        </span>
        <ha-ripple></ha-ripple>
      </div>
    `;
  }

  static styles = css`
    div {
      padding: 0;
      display: flex;
      text-align: center;
      box-sizing: border-box;
      align-items: center;
      justify-content: center;
      width: 100%;
      height: var(--header-height);
      cursor: pointer;
      position: relative;
    }

    .content {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      min-width: 0;
      max-width: 100%;
    }

    :host(:not([narrow])) .content {
      flex-direction: row;
      gap: var(--ha-space-2);
      flex-shrink: 0;
    }

    :host(:not([narrow])) div::before,
    :host(:not([narrow])) div::after {
      content: "";
      width: var(--ha-space-8);
      min-width: 0;
    }

    .badge {
      padding: 0 var(--ha-space-2);
      border-radius: var(--ha-border-radius-pill);
      font-size: var(--ha-font-size-s);
      line-height: var(--ha-line-height-normal);
      white-space: nowrap;
      color: var(--ha-color-on-primary-normal);
      background-color: var(--ha-color-fill-primary-normal-resting);
    }

    .icon {
      position: relative;
      display: inline-flex;
    }

    /* Narrow tabs have no room for the badge, a dot on the icon marks it */
    .dot {
      position: absolute;
      top: 0;
      inset-inline-end: calc(-1 * var(--ha-space-1));
      width: var(--ha-space-2);
      height: var(--ha-space-2);
      border-radius: var(--ha-border-radius-pill);
      background-color: var(--ha-color-fill-primary-loud-resting);
    }

    /* Hidden from view but still read out as part of the link name */
    :host([narrow]) .badge {
      position: absolute;
      width: 1px;
      height: 1px;
      padding: 0;
      overflow: hidden;
      clip-path: inset(50%);
    }

    .name {
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      min-width: 0;
      max-width: 100%;
    }

    :host([active]) {
      color: var(--primary-color);
    }

    :host(:not([narrow])[active]) div {
      border-bottom: 2px solid var(--primary-color);
    }

    :host([narrow]) {
      min-width: 0;
      display: flex;
      justify-content: center;
      overflow: hidden;
    }

    :host([narrow]) div {
      padding: 0 4px;
    }

    ::slotted([slot="icon"]) {
      margin-bottom: var(--ha-space-1);
    }

    :host(:not([narrow])) ::slotted([slot="icon"]) {
      margin-bottom: 0;
    }
  `;
}
declare global {
  interface HTMLElementTagNameMap {
    "ha-tab": HaTab;
  }
}
