import Spinner from "@home-assistant/webawesome/dist/components/spinner/spinner";
import type { CSSResultGroup, PropertyValues } from "lit";
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
          this.style.setProperty("--ha-spinner-size", "16px");
          break;
        case "small":
          this.style.setProperty("--ha-spinner-size", "28px");
          break;
        case "medium":
          this.style.setProperty("--ha-spinner-size", "48px");
          break;
        case "large":
          this.style.setProperty("--ha-spinner-size", "68px");
          break;
        case undefined:
          this.style.removeProperty("--ha-progress-ring-size");
          break;
      }
    }
  }

  static get styles(): CSSResultGroup {
    return [
      Spinner.styles,
      css`
        :host {
          --indicator-color: var(
            --ha-spinner-indicator-color,
            var(--primary-color)
          );
          --track-color: var(--ha-spinner-divider-color, var(--divider-color));
          --track-width: 4px;
          --speed: 3.5s;
          font-size: var(--ha-spinner-size, 48px);
        }
      `,
    ];
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-spinner": HaSpinner;
  }
}
