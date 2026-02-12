import DropdownItem from "@home-assistant/webawesome/dist/components/dropdown-item/dropdown-item";
import "@home-assistant/webawesome/dist/components/icon/icon";
import { mdiCheckboxBlankOutline, mdiCheckboxMarked } from "@mdi/js";
import { css, type CSSResultGroup, html } from "lit";
import { customElement, property } from "lit/decorators";
import "./ha-svg-icon";

/**
 * Home Assistant dropdown item component
 *
 * @element ha-dropdown-item
 * @extends {DropdownItem}
 *
 * @summary
 * A stylable dropdown item component supporting Home Assistant theming, variants, and appearances based on webawesome dropdown item.
 *
 */
@customElement("ha-dropdown-item")
export class HaDropdownItem extends DropdownItem {
  @property({ type: Boolean, reflect: true }) selected = false;

  protected renderCheckboxIcon() {
    return html`
      <ha-svg-icon
        id="check"
        part="checkmark"
        .path=${this.checked ? mdiCheckboxMarked : mdiCheckboxBlankOutline}
      ></ha-svg-icon>
    `;
  }

  static get styles(): CSSResultGroup {
    return [
      DropdownItem.styles,
      css`
        :host {
          min-height: var(--ha-space-10);
        }

        #check {
          visibility: visible;
          flex-shrink: 0;
        }

        #icon ::slotted(*) {
          color: var(--ha-color-on-neutral-normal);
        }

        :host([variant="danger"]) #icon ::slotted(*) {
          color: var(--ha-color-on-danger-quiet);
        }

        :host([selected]) {
          font-weight: var(--ha-font-weight-medium);
          color: var(--primary-color);
          background-color: var(--ha-color-fill-primary-quiet-resting);
          --icon-primary-color: var(--primary-color);
        }
      `,
    ];
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-dropdown-item": HaDropdownItem;
  }
}
