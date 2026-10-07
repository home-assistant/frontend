import { css, html, LitElement } from "lit";
import { property, state } from "lit/decorators.js";

/**
 * Container that groups related content.
 *
 * Importing this module does not register the element. Import
 * `@home-assistant/hac/card` to register `<hac-card>`.
 *
 * @slot header - Header of the card, usually a `hac-header`.
 * @slot - Content of the card.
 * @slot footer - Footer of the card, e.g. actions. Hidden when empty.
 *
 * @cssprop --hac-card-background - Background of the card.
 * @cssprop --hac-card-color - Text color of the card.
 * @cssprop --hac-card-border-color - Border color of the card.
 * @cssprop --hac-card-border-width - Border width of the card.
 * @cssprop --hac-card-border-radius - Border radius of the card.
 * @cssprop --hac-card-box-shadow - Box shadow of the card.
 * @cssprop --hac-card-content-padding - Padding of the content.
 * @cssprop --hac-card-footer-padding - Padding of the footer.
 */
export class HacCard extends LitElement {
  /** Visual style of the card. */
  @property({ reflect: true }) public appearance: "outlined" | "raised" =
    "outlined";

  @state() private _hasHeader = false;

  @state() private _hasFooter = false;

  protected render() {
    return html`
      <slot name="header" @slotchange=${this._headerChanged}></slot>
      <div class="content ${this._hasHeader ? "below-header" : ""}">
        <slot></slot>
      </div>
      <div class="footer" ?hidden=${!this._hasFooter}>
        <slot name="footer" @slotchange=${this._footerChanged}></slot>
      </div>
    `;
  }

  private _headerChanged(ev: Event) {
    this._hasHeader = _hasAssignedElements(ev);
  }

  private _footerChanged(ev: Event) {
    this._hasFooter = _hasAssignedElements(ev);
  }

  static styles = css`
    :host {
      display: block;
      position: relative;
      box-sizing: border-box;
      background: var(
        --hac-card-background,
        var(--card-background-color, #fff)
      );
      color: var(--hac-card-color, var(--primary-text-color, #141414));
      border: var(--hac-card-border-width, 1px) solid
        var(--hac-card-border-color, var(--divider-color, #e0e0e0));
      border-radius: var(
        --hac-card-border-radius,
        var(--ha-border-radius-lg, 12px)
      );
      box-shadow: var(--hac-card-box-shadow, none);
    }

    :host([appearance="raised"]) {
      border-color: transparent;
      box-shadow: var(
        --hac-card-box-shadow,
        0 2px 1px -1px rgba(0, 0, 0, 0.2),
        0 1px 1px 0 rgba(0, 0, 0, 0.14),
        0 1px 3px 0 rgba(0, 0, 0, 0.12)
      );
    }

    .content {
      padding: var(--hac-card-content-padding, var(--ha-space-4, 16px));
    }

    /* The header already provides the spacing above the content */
    .content.below-header {
      padding-block-start: 0;
    }

    .footer {
      display: flex;
      flex-wrap: wrap;
      justify-content: flex-end;
      align-items: center;
      gap: var(--ha-space-2, 8px);
      padding: var(--hac-card-footer-padding, var(--ha-space-2, 8px));
      border-block-start: 1px solid var(--divider-color, #e0e0e0);
    }

    .footer[hidden] {
      display: none;
    }
  `;
}

const _hasAssignedElements = (ev: Event) =>
  (ev.target as HTMLSlotElement).assignedElements().length > 0;

declare global {
  interface HTMLElementTagNameMap {
    "hac-card": HacCard;
  }
}
