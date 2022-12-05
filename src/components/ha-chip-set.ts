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
import { customElement } from "lit/decorators";

@customElement("ha-chip-set")
export class HaChipSet extends LitElement {
  protected render(): TemplateResult {
    return html`
      <div class="mdc-chip-set">
        <slot></slot>
      </div>
    `;
  }

  static get styles(): CSSResultGroup {
    return css`
      ${unsafeCSS(chipStyles)}

      slot::slotted(ha-chip) {
        margin: 4px 4px 4px 0;
      }
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-chip-set": HaChipSet;
  }
}
