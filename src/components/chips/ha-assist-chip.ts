import { MdAssistChip } from "@material/web/chips/assist-chip";
import { css, html } from "lit";
import { customElement, property } from "lit/decorators";

@customElement("ha-assist-chip")
export class HaAssistChip extends MdAssistChip {
  @property({ type: Boolean, reflect: true }) filled = false;

  @property({ type: Boolean, reflect: true }) elevaled = false;

  protected override getContainerClasses() {
    return {
      ...super.getContainerClasses(),
      elevated: this.elevated || this.filled,
    };
  }

  static override styles = [
    ...super.styles,
    css`
      :host {
        --md-sys-color-primary: var(--primary-text-color);
        --md-sys-color-on-surface: var(--primary-text-color);
        --md-assist-chip-container-shape: 16px;
        --md-assist-chip-outline-color: var(--outline-color);
        --md-assist-chip-label-text-weight: 400;
      }
      /** Material 3 doesn't have a filled chip, so we have to make our own using elevated variant **/
      :host([filled]) {
        --md-assist-chip-elevated-container-elevation: 0;
        --md-assist-chip-elevated-pressed-container-elevation: 0;
        --md-assist-chip-elevated-focus-container-elevation: 0;
        --md-assist-chip-elevated-hover-container-elevation: 0;
        --md-assist-chip-elevated-container-color: var(
          --ha-assist-chip-filled-container-color,
          rgba(var(--rgb-primary-text-color), 0.15)
        );
      }
    `,
  ];

  protected override renderOutline() {
    if (this.filled) {
      return html`<md-elevation></md-elevation>`;
    }

    return super.renderOutline();
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-assist-chip": HaAssistChip;
  }
}
