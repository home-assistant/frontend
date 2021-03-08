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

declare global {
  // for fire event
  interface HASSDomEvents {
    "chip-clicked": { index: string };
  }
}

@customElement("ha-chip")
export class HaChip extends LitElement {
  @property() public index = 0;
  @property() public label = "";

  protected render(): TemplateResult {
    return html`
      <div class="mdc-chip" .index=${this.index}>
        <div class="mdc-chip__ripple" .ripple="${ripple()}"></div>
        <span role="gridcell">
          <span role="button" tabindex="0" class="mdc-chip__primary-action">
            <span class="mdc-chip__text">${this.label}</span>
          </span>
        </span>
      </div>
    `;
  }

  static get styles(): CSSResult {
    return css`
      ${unsafeCSS(chipStyles)}
      .mdc-chip {
        background-color: var(--ha-chip-background-color);
        color: var(--ha-chip-text-color);
      }
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-chip": HaChip;
  }
}
