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
import "./ha-chip";

export interface HaChipSetItem {
  label?: string;
  leadingIcon?: string;
  trailingIcon?: string;
  outlined?: boolean;
  active?: boolean;
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
                    .index=${idx}
                    .active=${item.active || false}
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

  static get styles(): CSSResultGroup {
    return css`
      ${unsafeCSS(chipStyles)}
      .mdc-chip-set > ha-chip, slot::slotted(ha-chip) {
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
