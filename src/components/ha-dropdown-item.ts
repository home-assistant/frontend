import DropdownItem from "@home-assistant/webawesome/dist/components/dropdown-item/dropdown-item";
import "@home-assistant/webawesome/dist/components/icon/icon";
import { mdiCheckboxBlankOutline, mdiCheckboxMarked } from "@mdi/js";
import { css, type CSSResultGroup, html, nothing } from "lit";
import { customElement } from "lit/decorators";
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
  // overwritten wa-dropdown-item render function, to add unchecked icon support
  render() {
    return html`
      ${this.type === "checkbox"
        ? html`
            <ha-svg-icon
              id="check"
              part="checkmark"
              .path=${this.checked
                ? mdiCheckboxMarked
                : mdiCheckboxBlankOutline}
            ></ha-svg-icon>
          `
        : nothing}

      <span id="icon" part="icon">
        <slot name="icon"></slot>
      </span>

      <span id="label" part="label">
        <slot></slot>
      </span>

      <span id="details" part="details">
        <slot name="details"></slot>
      </span>

      ${this.hasSubmenu
        ? html`
            <wa-icon
              id="submenu-indicator"
              part="submenu-icon"
              exportparts="svg:submenu-icon__svg"
              library="system"
              name="chevron-right"
            ></wa-icon>
          `
        : nothing}
      ${this.hasSubmenu
        ? html`
            <div
              id="submenu"
              part="submenu"
              popover="manual"
              role="menu"
              tabindex="-1"
              aria-orientation="vertical"
              hidden
            >
              <slot name="submenu"></slot>
            </div>
          `
        : nothing}
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
        }

        #icon ::slotted(*) {
          color: var(--ha-color-on-neutral-normal);
        }

        :host([variant="danger"]) #icon ::slotted(*) {
          color: var(--ha-color-on-danger-quiet);
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
