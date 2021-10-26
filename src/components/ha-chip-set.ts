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

export interface HaChipSetItem {
  label?: string;
  leadingIcon?: string;
  trailingIcon?: string;
  outlined?: boolean;
}

@customElement("ha-chip-set")
export class HaChipSet extends LitElement {
  @property({ attribute: false }) public items?: HaChipSetItem[];

  protected render(): TemplateResult {
    return html`
      <div class="mdc-chip-set">
        ${this.items
          ? this.items.map(
              (item, idx) =>
                html`
                  <ha-chip
                    @click=${this._handleClick}
                    .index=${idx}
                    .label=${item.label}
                    .leadingIcon=${item.leadingIcon}
                    .trailingIcon=${item.trailingIcon}
                    ?outlined=${item.outlined}
                  >
                  </ha-chip>
                `
            )
          : html`<slot></slot>`}
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
      .mdc-chip-set > * {
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
