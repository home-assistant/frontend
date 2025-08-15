import ProgressRing from "@awesome.me/webawesome/dist/components/progress-ring/progress-ring";
import { css } from "lit";
import type { CSSResultGroup } from "lit";
import { customElement, property } from "lit/decorators";
import { StateSet } from "../resources/polyfills/stateset";

@customElement("ha-progress-ring")
export class HaProgressRing extends ProgressRing {
  @property() public size?: "tiny" | "small" | "medium" | "large";

  attachInternals() {
    const internals = super.attachInternals();
    Object.defineProperty(internals, "states", {
      value: new StateSet(this, internals.states),
    });
    return internals;
  }

  public updated(changedProps) {
    super.updated(changedProps);

    if (changedProps.has("size")) {
      switch (this.size) {
        case "tiny":
          this.style.setProperty("--ha-progress-ring-size", "16px");
          break;
        case "small":
          this.style.setProperty("--ha-progress-ring-size", "28px");
          break;
        case "medium":
          this.style.setProperty("--ha-progress-ring-size", "48px");
          break;
        case "large":
          this.style.setProperty("--ha-progress-ring-size", "68px");
          break;
        case undefined:
          this.style.removeProperty("--ha-progress-ring-size");
          break;
      }
    }
  }

  static get styles(): CSSResultGroup {
    return [
      ProgressRing.styles,
      css`
        :host {
          --indicator-color: var(
            --ha-progress-ring-indicator-color,
            var(--primary-color)
          );
          --track-color: var(
            --ha-progress-ring-divider-color,
            var(--divider-color)
          );
          --track-width: 4px;
          --speed: 3.5s;
          --size: var(--ha-progress-ring-size, 48px);
        }
      `,
    ];
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-progress-ring": HaProgressRing;
  }
}
