import { AssistChip } from "@material/web/chips/internal/assist-chip";
import { styles } from "@material/web/chips/internal/assist-styles";

import { styles as sharedStyles } from "@material/web/chips/internal/shared-styles";
import { styles as elevatedStyles } from "@material/web/chips/internal/elevated-styles";

import { css, html } from "lit";
import { customElement, property } from "lit/decorators";

@customElement("ha-assist-chip")
// @ts-ignore
export class HaAssistChip extends AssistChip {
  @property({ type: Boolean, reflect: true }) filled = false;

  @property({ type: Boolean }) active = false;

  static override styles = [
    sharedStyles,
    elevatedStyles,
    styles,
    css`
      :host {
        --md-sys-color-primary: var(--primary-text-color);
        --md-sys-color-on-surface: var(--primary-text-color);
        --md-assist-chip-container-shape: var(
          --ha-assist-chip-container-shape,
          16px
        );
        --md-assist-chip-outline-color: var(--outline-color);
        --md-assist-chip-label-text-weight: 400;
      }
      /** Material 3 doesn't have a filled chip, so we have to make our own **/
      .filled {
        display: flex;
        pointer-events: none;
        border-radius: inherit;
        inset: 0;
        position: absolute;
        background-color: var(--ha-assist-chip-filled-container-color);
      }
      /** Set the size of mdc icons **/
      ::slotted([slot="icon"]),
      ::slotted([slot="trailing-icon"]) {
        display: flex;
        --mdc-icon-size: var(--md-input-chip-icon-size, 18px);
        font-size: var(--_label-text-size) !important;
      }

      .trailing.icon ::slotted(*),
      .trailing.icon svg {
        margin-inline-end: unset;
        margin-inline-start: var(--_icon-label-space);
      }
      ::before {
        background: var(--ha-assist-chip-container-color, transparent);
        opacity: var(--ha-assist-chip-container-opacity, 1);
      }
      :where(.active)::before {
        background: var(--ha-assist-chip-active-container-color);
        opacity: var(--ha-assist-chip-active-container-opacity);
      }
      .label {
        font-family: var(--ha-font-family-body);
      }
    `,
  ];

  protected override renderOutline() {
    if (this.filled) {
      return html`<span class="filled"></span>`;
    }

    return super.renderOutline();
  }

  protected override getContainerClasses() {
    return {
      ...super.getContainerClasses(),
      active: this.active,
    };
  }

  protected override renderPrimaryContent() {
    return html`
      <span class="leading icon" aria-hidden="true">
        ${this.renderLeadingIcon()}
      </span>
      <span class="label">${this.label}</span>
      <span class="touch"></span>
      <span class="trailing leading icon" aria-hidden="true">
        ${this.renderTrailingIcon()}
      </span>
    `;
  }

  protected renderTrailingIcon() {
    return html`<slot name="trailing-icon"></slot>`;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-assist-chip": HaAssistChip;
  }
}
