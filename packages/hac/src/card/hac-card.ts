import { css, html, LitElement } from "lit";
import { customElement, property, state } from "lit/decorators.js";

/**
 * Container that groups related content.
 *
 * @slot header - Header of the card, usually a `hac-header`.
 * @slot - Content of the card.
 * @slot footer - Footer of the card, e.g. actions.
 *
 * @cssprop --hac-card-background - Background of the card.
 * @cssprop --hac-card-border-color - Border color of the card.
 * @cssprop --hac-card-border-width - Border width of the card.
 * @cssprop --hac-card-border-radius - Border radius of the card.
 * @cssprop --hac-card-box-shadow - Box shadow of the card.
 * @cssprop --hac-card-content-padding - Padding of the content.
 */
@customElement("hac-card")
export class HacCard extends LitElement {
  /** Visual style of the card. */
  @property({ reflect: true }) public appearance: "outlined" | "raised" =
    "outlined";

  @state() private _hasHeader = false;

  @state() private _hasFooter = false;

  protected render() {
    return html`
      <slot name="header" @slotchange=${this._handleHeaderChange}></slot>
      <div class=${this._hasHeader ? "content with-header" : "content"}>
        <slot></slot>
      </div>
      <div class="footer" ?hidden=${!this._hasFooter}>
        <slot name="footer" @slotchange=${this._handleFooterChange}></slot>
      </div>
    `;
  }

  private _handleHeaderChange(ev: Event) {
    this._hasHeader = (ev.target as HTMLSlotElement).assignedNodes().length > 0;
  }

  private _handleFooterChange(ev: Event) {
    this._hasFooter = (ev.target as HTMLSlotElement).assignedNodes().length > 0;
  }

  static styles = css`
    :host {
      display: block;
      position: relative;
      box-sizing: border-box;
      background: var(--hac-card-background, var(--card-background-color));
      color: var(--primary-text-color);
      border-radius: var(--hac-card-border-radius, var(--ha-border-radius-lg));
      border: var(--hac-card-border-width, 1px) solid
        var(--hac-card-border-color, var(--divider-color));
      box-shadow: var(--hac-card-box-shadow, none);
      overflow: hidden;
    }

    :host([appearance="raised"]) {
      border-color: transparent;
      box-shadow: var(
        --hac-card-box-shadow,
        0px 2px 1px -1px rgba(0, 0, 0, 0.2),
        0px 1px 1px 0px rgba(0, 0, 0, 0.14),
        0px 1px 3px 0px rgba(0, 0, 0, 0.12)
      );
    }

    .content {
      padding: var(--hac-card-content-padding, var(--ha-space-4));
    }

    .content.with-header {
      padding-top: var(--ha-space-2);
    }

    .footer {
      border-top: 1px solid var(--divider-color);
      padding: var(--ha-space-2);
    }

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
