import { customElement, property } from "lit-element";
import { CircularProgress } from "@material/mwc-circular-progress";

@customElement("ha-circular-progress")
// @ts-ignore
export class HaCircularProgress extends CircularProgress {
  @property({ type: Boolean })
  public active = false;

  @property()
  public alt = "Loading";

  @property()
  public size: "small" | "medium" | "large" = "medium";

  // @ts-ignore
  public set density(_) {
    // just a dummy
  }

  public get density() {
    switch (this.size) {
      case "small":
        return -5;
      case "medium":
        return 0;
      case "large":
        return 5;
      default:
        return 0;
    }
  }

  // @ts-ignore
  public set indeterminate(_) {
    // just a dummy
  }

  public get indeterminate() {
    return this.active;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-circular-progress": HaCircularProgress;
  }
}
