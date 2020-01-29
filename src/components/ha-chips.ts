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
              <button
                class="mdc-chip"
                .index=${idx}
                @click=${this._handleClick}
              >
                <span class="mdc-chip__text">${item}</span>
              </button>
            `
        )}
      </div>
    `;
  }

  private _handleClick(ev) {
    fireEvent(this, "chip-clicked", {
      index: ev.target.closest("button").index,
    });
  }

  static get styles(): CSSResult {
    return css`
      ${unsafeCSS(chipStyles)}
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-chips": HaChips;
  }
}
