import { css, html, LitElement, nothing } from "lit";
import { customElement, property } from "lit/decorators";
import "./ha-svg-icon";

/**
 * Centered placeholder for a surface that has nothing to show, with an icon, a
 * heading, an optional description and optional actions.
 *
 * @slot - Actions that help the user fill the surface, e.g. a button.
 */
@customElement("ha-empty-state")
export class HaEmptyState extends LitElement {
  /** SVG path of the icon shown above the heading. */
  @property() public icon?: string;

  @property() public heading?: string;

  @property() public description?: string;

  protected render() {
    return html`
      <div class="content">
        ${
          this.icon
            ? html`<ha-svg-icon .path=${this.icon}></ha-svg-icon>`
            : nothing
        }
        ${this.heading ? html`<h2>${this.heading}</h2>` : nothing}
        ${this.description ? html`<p>${this.description}</p>` : nothing}
        <slot></slot>
      </div>
    `;
  }

  static styles = css`
    :host {
      display: flex;
      align-items: center;
      justify-content: center;
      box-sizing: border-box;
      height: 100%;
      width: 100%;
    }

    .content {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: var(--ha-space-4);
      box-sizing: border-box;
      max-width: 500px;
      padding: var(--ha-space-8) var(--ha-space-4);
      text-align: center;
    }

    ha-svg-icon {
      --mdc-icon-size: var(--ha-empty-state-icon-size, 64px);
      color: var(--secondary-text-color);
    }

    h2 {
      margin: 0;
      font-size: var(--ha-font-size-xl);
      font-weight: var(--ha-font-weight-medium);
      line-height: var(--ha-line-height-condensed);
    }

    p {
      margin: 0;
      color: var(--secondary-text-color);
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-empty-state": HaEmptyState;
  }
}
