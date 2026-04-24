import type { CSSResultGroup } from "lit";
import { css } from "lit";
import { customElement, property } from "lit/decorators";
import { HaRowItem } from "./ha-row-item";

/**
 * @element ha-list-item-base
 * @extends {HaRowItem}
 *
 * @summary
 * Non-interactive list row (role `listitem`). Base class for
 * `ha-list-item-button`, `ha-list-item-option`.
 *
 * @cssprop --ha-list-item-focus-radius - Focus outline border-radius.
 * @cssprop --ha-list-item-focus-width - Focus outline width (steady state).
 * @cssprop --ha-list-item-focus-width-start - Focus outline width at the start of the focus-in animation.
 * @cssprop --ha-list-item-focus-offset - Focus outline offset.
 * @cssprop --ha-list-item-focus-background - Background color applied on keyboard focus.
 *
 * @attr {boolean} interactive - Opts the row into the parent list's roving tabindex. Interactive subclasses set this automatically.
 */
@customElement("ha-list-item-base")
export class HaListItemBase extends HaRowItem {
  /**
   * Whether the item takes keyboard focus. Read by the parent list to decide
   * if it should be part of the roving-tabindex ring. Interactive subclasses
   * (`ha-list-item-button`, `-option`, `-todo`) override the default to `true`.
   * For the plain base row, set the `interactive` attribute to opt into focus
   * (useful for sortable rows where you need keyboard reorder but no click
   * action).
   */
  @property({ type: Boolean, reflect: true }) public interactive = false;

  /** Host `role` attribute. Subclasses override. */
  protected readonly defaultRole: string = "listitem";

  public connectedCallback(): void {
    super.connectedCallback();
    if (!this.hasAttribute("role")) {
      this.setAttribute("role", this.defaultRole);
    }
  }

  /**
   * Activate the item (Enter/Space from the parent list). Default dispatches
   * a click on the host. Subclasses that wrap a native element (e.g. `<a>`)
   * override this to click the inner element so browser default actions
   * (like anchor navigation) fire.
   */
  public activate(): void {
    this.click();
  }

  static styles: CSSResultGroup = [
    HaRowItem.styles,
    css`
      :host {
        --ha-list-item-focus-radius: var(--ha-border-radius-sm);
        --ha-list-item-focus-width: 2px;
        --ha-list-item-focus-width-start: var(--ha-space-2);
        --ha-list-item-focus-offset: -2px;
        --ha-list-item-focus-background: var(
          --ha-color-fill-neutral-quiet-hover
        );
      }
      :host(:focus) {
        outline: none;
      }
      .base {
        border-radius: var(--ha-list-item-focus-radius);
        outline: var(--ha-list-item-focus-width) solid transparent;
        outline-offset: var(--ha-list-item-focus-offset);
        transition:
          outline-color var(--ha-animation-duration-fast) ease-out,
          background-color var(--ha-animation-duration-fast) ease-out;
      }
      @keyframes ha-list-item-focus-in {
        from {
          outline-width: var(--ha-list-item-focus-width-start);
          outline-offset: calc(-1 * var(--ha-list-item-focus-width-start));
        }
        to {
          outline-width: var(--ha-list-item-focus-width);
          outline-offset: var(--ha-list-item-focus-offset);
        }
      }
      :host(:focus-visible) .base {
        outline-color: var(--ha-color-focus);
        background-color: var(--ha-list-item-focus-background);
        animation: ha-list-item-focus-in var(--ha-animation-duration-normal)
          ease-in;
      }
    `,
  ];
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-list-item-base": HaListItemBase;
  }
}
