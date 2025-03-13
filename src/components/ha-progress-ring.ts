import ProgressRing from "@shoelace-style/shoelace/dist/components/progress-ring/progress-ring.component";
import progressRingStyles from "@shoelace-style/shoelace/dist/components/progress-ring/progress-ring.styles";
import { css } from "lit";
import { customElement, property } from "lit/decorators";

@customElement("ha-progress-ring")
export class HaProgressRing extends ProgressRing {
  @property() public size?: "tiny" | "small" | "medium" | "large";

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

  static override styles = [
    progressRingStyles,
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

declare global {
  interface HTMLElementTagNameMap {
    "ha-progress-ring": HaProgressRing;
  }
}
