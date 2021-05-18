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
import { fireEvent } from "../common/dom/fire_event";
import "./ha-chip";

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
              <ha-chip .index=${idx} @click=${this._handleClick}>
                ${item}
              </ha-chip>
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

  static get styles(): CSSResultGroup {
    return css`
      ${unsafeCSS(chipStyles)}

      ha-chip {
        margin: 4px;
      }
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-chip-set": HaChipSet;
  }
}
