import { css, html, LitElement } from "lit";
import { customElement } from "lit/decorators";

/**
 * Home Assistant dialog footer component
 *
 * @element ha-dialog-footer
 * @extends {LitElement}
 *
 * @summary
 * A simple footer container for dialog actions,
 * typically used as the `footer` slot in `ha-wa-dialog`.
 *
 * @slot primaryAction - Primary action button(s), aligned to the end.
 * @slot secondaryAction - Secondary action button(s), placed before the primary action.
 *
 * @remarks
 * **Button Styling Guidance:**
 * - `primaryAction` slot: Use `variant="accent"`
 * - `secondaryAction` slot: Use `variant="plain"`
 */
@customElement("ha-dialog-footer")
export class HaDialogFooter extends LitElement {
  protected render() {
    return html`
      <footer>
        <slot name="secondaryAction"></slot>
        <slot name="primaryAction"></slot>
      </footer>
    `;
  }

  static get styles() {
    return [
      css`
        .footer {
          display: flex;
          gap: var(--ha-space-3);
          justify-content: flex-end;
          align-items: center;
          width: 100%;
        }
      `,
    ];
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-dialog-footer": HaDialogFooter;
  }
}
