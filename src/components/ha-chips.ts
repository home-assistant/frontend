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
          (item) =>
            html`
              <button class="mdc-chip">
                <span class="mdc-chip__text">${item}</span>
              </button>
            `
        )}
      </div>
    `;
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
