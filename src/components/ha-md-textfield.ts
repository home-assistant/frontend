import { styles } from "@material/web/textfield/internal/filled-styles";
import { FilledTextField } from "@material/web/textfield/internal/filled-text-field";
import { styles as sharedStyles } from "@material/web/textfield/internal/shared-styles";
import { css } from "lit";
import { customElement } from "lit/decorators";

@customElement("ha-md-textfield")
export class HaMdTextfield extends FilledTextField {
  static override styles = [
    sharedStyles,
    styles,
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
