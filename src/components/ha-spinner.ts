import Spinner from "@shoelace-style/shoelace/dist/components/spinner/spinner.component";
import spinnerStyles from "@shoelace-style/shoelace/dist/components/spinner/spinner.styles";
import type { PropertyValues } from "lit";
import { css } from "lit";
import { customElement, property } from "lit/decorators";

@customElement("ha-spinner")
export class HaSpinner extends Spinner {
  @property() public size?: "tiny" | "small" | "medium" | "large";

  protected updated(changedProps: PropertyValues) {
    super.updated(changedProps);

    if (changedProps.has("size")) {
      switch (this.size) {
        case "tiny":
          this.style.setProperty("font-size", "16px");
          break;
        case "small":
          this.style.setProperty("font-size", "28px");
          break;
        case "medium":
          this.style.setProperty("font-size", "48px");
          break;
        case "large":
          this.style.setProperty("font-size", "68px");
          break;
      }
    }
  }

  static override styles = [
    spinnerStyles,
    css`
      :host {
        --indicator-color: var(--primary-color);
        --track-color: var(--divider-color);
        --track-width: 4px;
        --speed: 3.5s;
        font-size: var(--ha-spinner-size, 48px);
      }
    `,
  ];
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-spinner": HaSpinner;
  }
}
