import { css, html, LitElement } from "lit";
import { customElement } from "lit/decorators";

@customElement("ha-section-title")
class HaSectionTitle extends LitElement {
  protected render() {
    return html`<slot></slot>`;
  }

  static styles = css`
    :host {
      display: block;
      background-color: var(--ha-color-fill-neutral-quiet-resting);
      padding: var(--ha-space-1) var(--ha-space-2);
      font-weight: var(--ha-font-weight-bold);
      color: var(--secondary-text-color);
      min-height: var(--ha-space-6);
      display: flex;
      align-items: center;
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-section-title": HaSectionTitle;
  }
}
