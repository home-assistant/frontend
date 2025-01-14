import { MdFilledTextField } from "@material/web/textfield/filled-text-field";
import { css } from "lit";
import { customElement } from "lit/decorators";

@customElement("ha-md-textfield")
export class HaMdTextfield extends MdFilledTextField {
  static override styles = [
    ...super.styles,
    css`
      :host {
        --ha-icon-display: block;
        --md-sys-color-primary: var(--primary-text-color);
        --md-sys-color-secondary: var(--secondary-text-color);
        --md-sys-color-surface: var(--card-background-color);
        --md-sys-color-on-surface-variant: var(--secondary-text-color);

        --md-sys-color-surface-container-highest: var(--input-fill-color);
        --md-sys-color-on-surface: var(--input-ink-color);

        --md-sys-color-surface-container: var(--input-fill-color);
        --md-sys-color-secondary-container: var(--input-fill-color);
      }
    `,
  ];
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-md-textfield": HaMdTextfield;
  }
}
