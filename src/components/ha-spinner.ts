import Spinner from "@awesome.me/webawesome/dist/components/spinner/spinner";
import type { CSSResultGroup, PropertyValues } from "lit";
import { css } from "lit";
import { customElement, property } from "lit/decorators";

import { StateSet } from "../resources/polyfills/stateset";

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

  attachInternals() {
    const internals = super.attachInternals();
    Object.defineProperty(internals, "states", {
      value: new StateSet(this, internals.states),
    });
    return internals;
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
