// @ts-ignore
import chipStyles from "@material/chips/dist/mdc.chips.min.css";
import { ripple } from "@material/mwc-ripple/ripple-directive";
import {
  css,
  CSSResult,
  customElement,
  html,
  LitElement,
  property,
  TemplateResult,
  unsafeCSS,
} from "lit-element";
import { fireEvent } from "../common/dom/fire_event";

declare global {
  // for fire event
  interface HASSDomEvents {
    "chip-clicked": { index: string };
  }
}

@customElement("ha-chip-set")
export class HaChipSet extends LitElement {
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
              <ha-chip
                .index=${idx}
                @click=${this._handleClick}
                .label=${item}
              />
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
    "ha-chip-set": HaChipSet;
  }
}
