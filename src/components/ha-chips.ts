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
import { classMap } from "lit-html/directives/class-map";
import { ripple } from "@material/mwc-ripple/ripple-directive";
// @ts-ignore
import chipStyles from "@material/chips/dist/mdc.chips.min.css";
import { fireEvent } from "../common/dom/fire_event";

import "./ha-icon";

declare global {
  // for fire event
  interface HASSDomEvents {
    "chip-clicked": { index: number };
    "chip-removed": { index: number };
  }
}

@customElement("ha-chips")
export class HaChips extends LitElement {
  @property() public items = [];
  @property() public type: "input" | "choice" = "choice";

  protected render(): TemplateResult {
    if (this.items.length === 0) {
      return html``;
    }

    return html`
      <div
        class="mdc-chip-set ${classMap({
          "mdc-chip-set--input": this.type === "input",
          "mdc-chip-set--choice": this.type === "choice",
        })}"
      >
        ${this.items.map(
          (item, idx) =>
            html`
              <div class="mdc-chip" .index=${idx} @click=${this._handleClick}>
                <div class="mdc-chip__ripple" .ripple=${ripple()}></div>
                <span role="gridcell">
                  <span
                    role="button"
                    tabindex="0"
                    class="mdc-chip__primary-action"
                  >
                    <span class="mdc-chip__text">${item}</span>
                  </span>
                </span>
                ${this.type === "input"
                  ? html`
                      <span role="gridcell">
                        <ha-icon
                          class="mdc-chip__icon mdc-chip__icon--trailing"
                          icon="mdi:close-circle"
                          tabindex="-1"
                          role="button"
                          @click=${this._handleRemove}
                        ></ha-icon>
                      </span>
                    `
                  : ""}
              </div>
            `
        )}
      </div>
    `;
  }

  private _handleClick(ev: MouseEvent): void {
    fireEvent(this, "chip-clicked", {
      index: (ev.currentTarget as any).index,
    });
  }

  private _handleRemove(ev: MouseEvent): void {
    ev.stopPropagation();
    fireEvent(this, "chip-removed", {
      index: (ev.currentTarget as any).index,
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
