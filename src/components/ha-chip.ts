import "./ha-svg-icon"; // @ts-ignore
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
import { fireEvent } from "../common/dom/fire_event";

declare global {
  // for fire event
  interface HASSDomEvents {
    "chip-clicked": { index: number | undefined };
    "chip-clicked-trailing": { index: number | undefined };
  }
}

@customElement("ha-chip")
export class HaChip extends LitElement {
  @property({ type: Number }) public index?: number;

  @property({ type: Boolean }) public outlined = false;

  @property() public label?: string;

  @property() public leadingIcon?: string;

  @property() public trailingIcon?: string;

  protected render(): TemplateResult {
    return html`
      <div
        class="mdc-chip ${this.outlined ? "outlined" : ""}"
        @click=${this._handleClick}
      >
        ${this.leadingIcon
          ? html`<span role="gridcell">
              <span role="button" tabindex="0" class="mdc-chip__primary-action"
                ><ha-svg-icon
                  class="mdc-chip__icon mdc-chip__icon--leading"
                  .path=${this.leadingIcon}
                ></ha-svg-icon>
              </span>
            </span>`
          : ""}
        <div class="mdc-chip__ripple"></div>
        <span role="gridcell">
          <span role="row" tabindex="0" class="mdc-chip__primary-action">
            <span class="mdc-chip__text">
              ${this.label || html`<slot></slot>`}
            </span>
          </span>
        </span>
        <span role="gridcell">
          <span role="button" tabindex="-1" class="mdc-chip__primary-action">
            ${this.trailingIcon
              ? html`<ha-svg-icon
                  @click=${this._handleTrailingClick}
                  class="mdc-chip__icon mdc-chip__icon--trailing"
                  .path=${this.trailingIcon}
                >
                </ha-svg-icon>`
              : html`<slot name="trailing-icon"></slot>`}
          </span>
        </span>
      </div>
    `;
  }

  private _handleClick(): void {
    fireEvent(this, "chip-clicked", { index: this.index });
  }

  private _handleTrailingClick(): void {
    fireEvent(this, "chip-clicked-trailing", {
      index: this.index,
    });
  }

  static get styles(): CSSResultGroup {
    return css`
      ${unsafeCSS(chipStyles)}
      .mdc-chip {
        background-color: var(--ha-chip-background-color, var(--primary-color));
        color: var(--ha-chip-text-color, var(--text-primary-color));
      }

      .mdc-chip:hover {
        color: var(--ha-chip-text-color, var(--text-primary-color));
      }

      .mdc-chip.outlined {
        margin: 0 -1px !important;
        border: 1px solid var(--ha-chip-background-color, var(--primary-color));
        background-color: var(
          --ha-chip-outlined-background-color,
          var(--card-background-color)
        );
        color: var(--ha-chip-outlined-text-color, var(--primary-text-color));
      }

      .mdc-chip:not(.outlined) .mdc-chip__icon.mdc-chip__icon--leading {
        margin-left: -12px !important;
        margin-right: -2px;
        color: var(--ha-chip-icon-color, var(--text-primary-color));
      }

      .mdc-chip.outlined ha-svg-icon,
      slot[name="trailing-icon"]::slotted(ha-svg-icon) {
        border-radius: 50%;
        background-color: var(--ha-chip-background-color, var(--primary-color));
        color: var(--ha-chip-icon-color, var(--text-primary-color));
      }

      .mdc-chip.outlined .mdc-chip__icon.mdc-chip__icon--leading {
        margin-left: -13px !important;
        color: var(--ha-chip-icon-color, var(--text-primary-color));
      }

      .mdc-chip__icon.mdc-chip__icon--trailing,
      slot[name="trailing-icon"]::slotted(ha-svg-icon) {
        width: 18px;
        height: 18px;
        font-size: 18px;
        padding: 2px;
        color: var(--ha-chip-icon-color);
        margin-right: -8px;
        display: inline-flex;
        align-items: center;
        --mdc-icon-size: 12px;
      }

      slot[name="trailing-icon"]::slotted(ha-svg-icon) {
        margin-left: 4px;
      }

      .mdc-chip__icon--leading {
        display: flex;
        align-items: center;
        justify-content: center;
        color: inherit;
        border-radius: 50%;
        padding: 6px;
        --mdc-icon-size: 20px;
      }
      :host([disabled]) .mdc-chip {
        opacity: var(--light-disabled-opacity);
        pointer-events: none;
      }
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-chip": HaChip;
  }
}
