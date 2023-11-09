import { MdAssistChip } from "@material/web/chips/assist-chip";
import { css, html } from "lit";
import { customElement, property } from "lit/decorators";

@customElement("ha-assist-chip")
export class HaAssistChip extends MdAssistChip {
  @property({ type: Boolean, reflect: true }) filled = false;

  static override styles = [
    ...super.styles,
    css`
      :host {
        --md-sys-color-primary: var(--primary-text-color);
        --md-sys-color-on-surface: var(--primary-text-color);
        --md-assist-chip-container-shape: 16px;
        --md-assist-chip-outline-color: var(--outline-color);
        --md-assist-chip-label-text-weight: 400;
        --ha-assist-chip-filled-container-color: rgba(
          var(--rgb-primary-text-color),
          0.15
        );
      }
      /** Material 3 doesn't have a filled chip, so we have to make our own **/
      .filled {
        display: flex;
        pointer-events: none;
        border-radius: inherit;
        inset: 0;
        position: absolute;
        background-color: var(--ha-assist-chip-filled-container-color);
      }
      /** Set the size of mdc icons **/
      ::slotted([slot="icon"]) {
        display: flex;
        --mdc-icon-size: var(--md-input-chip-icon-size, 18px);
      }
    `,
  ];

  protected override renderOutline() {
    if (this.filled) {
      return html`<span class="filled"></span>`;
    }

    return super.renderOutline();
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-assist-chip": HaAssistChip;
  }
}
