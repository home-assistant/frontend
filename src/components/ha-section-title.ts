import { css, html, LitElement } from "lit";
import { customElement } from "lit/decorators";

@customElement("ha-section-title")
class HaSectionTitle extends LitElement {
  protected render() {
    return html`<slot></slot>`;
  }

  static styles = css`
    :host {
      background-color: var(--ha-color-fill-neutral-quiet-resting);
      padding: var(--ha-space-2) var(--ha-space-3);
      font-weight: var(--ha-font-weight-bold);
      color: var(--secondary-text-color);
      min-height: var(--ha-space-6);
      display: flex;
      align-items: center;
      box-sizing: border-box;
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-section-title": HaSectionTitle;
  }
}
