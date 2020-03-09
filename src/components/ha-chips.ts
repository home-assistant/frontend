import {
  css,
  CSSResult,
  html,
  LitElement,
  property,
  TemplateResult,
  customElement,
  unsafeCSS,
} from "lit-element";
import { ripple } from "@material/mwc-ripple/ripple-directive";
// @ts-ignore
import chipStyles from "@material/chips/dist/mdc.chips.min.css";
import { fireEvent } from "../common/dom/fire_event";

declare global {
  // for fire event
  interface HASSDomEvents {
    "chip-clicked": { index: string };
  }
}

@customElement("ha-chips")
export class HaChips extends LitElement {
  @property() public items = [];

  protected render(): TemplateResult {
    if (this.items.length === 0) {
      return html``;
    }
    return html`
      <div class="mdc-chip-set">
        ${this.items.map(
          (item, idx) =>
            html`
              <div class="mdc-chip" .index=${idx} @click=${this._handleClick}>
                <div class="mdc-chip__ripple" .ripple="${ripple()}"></div>
                <span role="gridcell">
                  <span
                    role="button"
                    tabindex="0"
                    class="mdc-chip__primary-action"
                  >
                    <span class="mdc-chip__text">${item}</span>
                  </span>
                </span>
              </div>
            `
        )}
      </div>
    `;
  }

  private _handleClick(ev): void {
    fireEvent(this, "chip-clicked", {
      index: ev.currentTarget.index,
    });
  }

  static get styles(): CSSResult {
    return css`
      ${unsafeCSS(chipStyles)}
      .mdc-chip {
        background-color: rgba(var(--rgb-primary-text-color), 0.15);
        color: var(--primary-text-color);
      }
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-chips": HaChips;
  }
}
