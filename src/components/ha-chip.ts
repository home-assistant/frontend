// @ts-ignore
import chipStyles from "@material/chips/dist/mdc.chips.min.css";
import {
  css,
  CSSResultGroup,
  html,
  LitElement,
  TemplateResult,
  unsafeCSS,
} from "lit";
import { customElement, property } from "lit/decorators";
import "./ha-icon";

declare global {
  // for fire event
  interface HASSDomEvents {
    "chip-clicked": { index: string };
  }
}

@customElement("ha-chip")
export class HaChip extends LitElement {
  @property() public index = 0;

  @property({ type: Boolean }) public hasIcon = false;

  protected render(): TemplateResult {
    return html`
      <div class="mdc-chip" .index=${this.index}>
        ${this.hasIcon
          ? html`<div class="mdc-chip__icon mdc-chip__icon--leading">
              <slot name="icon"></slot>
            </div>`
          : null}
        <div class="mdc-chip__ripple"></div>
        <span role="gridcell">
          <span role="button" tabindex="0" class="mdc-chip__primary-action">
            <span class="mdc-chip__text"><slot></slot></span>
          </span>
        </span>
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

      .mdc-chip:hover {
        color: var(--ha-chip-text-color, var(--primary-text-color));
      }

      .mdc-chip__icon--leading {
        --mdc-icon-size: 20px;
        color: var(--ha-chip-icon-color, var(--ha-chip-text-color));
      }
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-chip": HaChip;
  }
}
