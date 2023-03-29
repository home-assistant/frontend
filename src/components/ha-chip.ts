// @ts-ignore
import chipStyles from "@material/chips/dist/mdc.chips.min.css";
import { css, CSSResultGroup, html, LitElement, nothing, unsafeCSS } from "lit";
import { customElement, property } from "lit/decorators";

@customElement("ha-chip")
export class HaChip extends LitElement {
  @property({ type: Boolean }) public hasIcon = false;

  @property({ type: Boolean }) public hasTrailingIcon = false;

  @property({ type: Boolean }) public noText = false;

  protected render() {
    return html`
      <div class="mdc-chip ${this.noText ? "no-text" : ""}">
        ${this.hasIcon
          ? html`<div class="mdc-chip__icon mdc-chip__icon--leading">
              <slot name="icon"></slot>
            </div>`
          : nothing}
        <div class="mdc-chip__ripple"></div>
        <span role="gridcell">
          <span role="button" tabindex="0" class="mdc-chip__primary-action">
            <span class="mdc-chip__text"><slot></slot></span>
          </span>
        </span>
        ${this.hasTrailingIcon
          ? html`<div class="mdc-chip__icon mdc-chip__icon--trailing">
              <slot name="trailing-icon"></slot>
            </div>`
          : nothing}
      </div>
    `;
  }

  static get styles(): CSSResultGroup {
    return css`
      ${unsafeCSS(chipStyles)}
      .mdc-chip {
        background-color: var(
          --ha-chip-background-color,
          rgba(var(--rgb-primary-text-color), 0.15)
        );
        color: var(--ha-chip-text-color, var(--primary-text-color));
      }

      .mdc-chip.no-text {
        padding: 0 10px;
      }

      .mdc-chip:hover {
        color: var(--ha-chip-text-color, var(--primary-text-color));
      }

      .mdc-chip__icon--leading,
      .mdc-chip__icon--trailing {
        --mdc-icon-size: 18px;
        line-height: 14px;
        color: var(--ha-chip-icon-color, var(--ha-chip-text-color));
      }
      .mdc-chip.mdc-chip--selected .mdc-chip__checkmark,
      .mdc-chip .mdc-chip__icon--leading:not(.mdc-chip__icon--leading-hidden) {
        margin-right: -4px;
        margin-inline-start: -4px;
        margin-inline-end: 4px;
        direction: var(--direction);
      }

      span[role="gridcell"] {
        line-height: 14px;
      }

      :host {
        outline: none;
      }
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-chip": HaChip;
  }
}
