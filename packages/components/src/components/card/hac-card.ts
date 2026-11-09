import { css, html, LitElement } from "lit";
import { property, state } from "lit/decorators.js";
import {
  hasAssignedContent,
  hasAssignedElements,
} from "../../utils/element/slot";

/**
 * @element hac-card
 *
 * @summary
 * Card that groups related content, with an optional header and footer.
 *
 * @slot header - Header of the card. Its spacing replaces the top padding of
 * the content.
 * @slot - Content of the card. Its padding is omitted when empty.
 * @slot footer - Footer of the card. Hidden when empty.
 *
 * @csspart header - Wrapper of the header slot.
 * @csspart content - Wrapper of the default slot.
 * @csspart footer - Wrapper of the footer slot.
 *
 * @cssprop --hac-card-background - Background of the card.
 * @cssprop --hac-card-color - Text color of the card.
 * @cssprop --hac-card-border-color - Border color of the card and the footer divider.
 * @cssprop --hac-card-border-width - Border width of the card.
 * @cssprop --hac-card-border-radius - Border radius of the card.
 * @cssprop --hac-card-box-shadow - Box shadow of the card.
 * @cssprop --hac-card-content-padding - Padding of the content.
 * @cssprop --hac-card-footer-padding - Padding of the footer.
 */
export class HacCard extends LitElement {
  /**
   * Visual style of the card. `outlined` draws a border without a shadow.
   * `raised` hides the border and lifts the card with a shadow instead.
   */
  @property({ reflect: true }) public appearance: "outlined" | "raised" =
    "outlined";

  @state() private _hasHeader = false;

  @state() private _hasFooter = false;

  @state() private _hasContent = false;

  protected render() {
    return html`
      <div class="header" part="header" ?hidden=${!this._hasHeader}>
        <slot name="header" @slotchange=${this._headerChanged}></slot>
      </div>
      <div
        class="content ${this._hasHeader ? "below-header" : ""}"
        part="content"
        ?hidden=${!this._hasContent}
      >
        <slot @slotchange=${this._contentChanged}></slot>
      </div>
      <div class="footer" part="footer" ?hidden=${!this._hasFooter}>
        <slot name="footer" @slotchange=${this._footerChanged}></slot>
      </div>
    `;
  }

  private _headerChanged(ev: Event) {
    this._hasHeader = hasAssignedElements(ev);
  }

  private _contentChanged(ev: Event) {
    this._hasContent = hasAssignedContent(ev);
  }

  private _footerChanged(ev: Event) {
    this._hasFooter = hasAssignedElements(ev);
  }

  /*
   * Fallback order: --hac-card-*, then the theme variables of ha-card
   * (--ha-card-*, --card-background-color, --divider-color,
   * --primary-text-color) so existing themes keep working, then the semantic
   * tokens and their light values for use outside Home Assistant.
   * The ha-card variables are temporary, see "Theming" in the README.
   */
  static styles = css`
    :host {
      display: block;
      position: relative;
      box-sizing: border-box;
      background: var(
        --hac-card-background,
        var(
          --ha-card-background,
          var(--card-background-color, var(--ha-color-surface-default, #fff))
        )
      );
      backdrop-filter: var(--ha-card-backdrop-filter, none);
      color: var(
        --hac-card-color,
        var(--primary-text-color, var(--ha-color-on-surface-default, #141414))
      );
      border: var(--hac-card-border-width, var(--ha-card-border-width, 1px))
        solid
        var(
          --hac-card-border-color,
          var(
            --ha-card-border-color,
            var(--divider-color, var(--ha-color-border-neutral-quiet, #e6e6e6))
          )
        );
      border-radius: var(
        --hac-card-border-radius,
        var(--ha-card-border-radius, var(--ha-border-radius-lg, 12px))
      );
      box-shadow: var(--hac-card-box-shadow, var(--ha-card-box-shadow, none));
    }

    :host([appearance="raised"]) {
      border-color: transparent;
      box-shadow: var(
        --hac-card-box-shadow,
        var(
          --ha-card-box-shadow,
          var(
            --ha-box-shadow-s,
            0 1px 2px 0 rgba(0, 0, 0, 0.08),
            0 1px 3px 0 rgba(0, 0, 0, 0.12)
          )
        )
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
      align-items: center;
      gap: var(--ha-space-2, 8px);
      padding: var(--hac-card-footer-padding, var(--ha-space-2, 8px));
      border-block-start: 1px solid
        var(
          --hac-card-border-color,
          var(--divider-color, var(--ha-color-border-neutral-quiet, #e6e6e6))
        );
    }

    .header[hidden],
    .content[hidden],
    .footer[hidden] {
      display: none;
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    "hac-card": HacCard;
  }
}
