import { css, html, LitElement } from "lit";
import { customElement } from "lit/decorators";

@customElement("ha-dialog-footer")
export class HaDialogFooter extends LitElement {
  protected render() {
    return html`
      <footer class="footer">
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
          gap: 12px;
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
