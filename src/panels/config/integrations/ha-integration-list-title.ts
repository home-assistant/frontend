import { css, html, LitElement } from "lit";
import { customElement } from "lit/decorators";

/**
 * @element ha-integration-list-title
 * @summary Title above a group of integration cards, like a brand's name.
 * @slot - The title text.
 */
@customElement("ha-integration-list-title")
export class HaIntegrationListTitle extends LitElement {
  protected render() {
    return html`<slot></slot>`;
  }

  static styles = css`
    :host {
      display: flex;
      align-items: center;
      box-sizing: border-box;
      min-height: var(--ha-space-10);
      padding-block: var(--ha-space-2);
      padding-inline: var(--ha-space-8) var(--ha-space-3);
      font-weight: var(--ha-font-weight-medium);
      background-color: var(--card-background-color);
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-integration-list-title": HaIntegrationListTitle;
  }
}
