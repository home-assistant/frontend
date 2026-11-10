import { LitElement, css, html } from "lit";
import { customElement } from "lit/decorators";

/**
 * @element ha-action-bar
 *
 * @summary Bar with actions, placed below a scrolling list or content area.
 *
 * @slot - Actions of the bar, e.g. `ha-button` elements.
 *
 * @cssprop --ha-action-bar-border-top - Top border of the bar, set it to match the border of the parent. Defaults to `var(--ha-border-width-sm) solid var(--divider-color)`.
 */
@customElement("ha-action-bar")
export class HaActionBar extends LitElement {
  protected render() {
    return html`<slot></slot>`;
  }

  static styles = css`
    :host {
      display: flex;
      align-items: center;
      gap: var(--ha-space-2);
      padding: var(--ha-space-3);
      border-top: var(
        --ha-action-bar-border-top,
        var(--ha-border-width-sm) solid var(--divider-color)
      );
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-action-bar": HaActionBar;
  }
}
