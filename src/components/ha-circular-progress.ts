import { MdCircularProgress } from "@material/web/progress/circular-progress";
import { PropertyValues, css } from "lit";
import { customElement, property } from "lit/decorators";

@customElement("ha-circular-progress")
export class HaCircularProgress extends MdCircularProgress {
  @property({ attribute: "aria-label", type: String }) public ariaLabel =
    "Loading";

  @property() public size: "tiny" | "small" | "medium" | "large" = "medium";

  protected updated(changedProps: PropertyValues) {
    super.updated(changedProps);

    if (changedProps.has("size")) {
      switch (this.size) {
        case "tiny":
          this.style.setProperty("--md-circular-progress-size", "16px");
          break;
        case "small":
          this.style.setProperty("--md-circular-progress-size", "28px");
          break;
        // medium is default size
        case "medium":
          this.style.setProperty("--md-circular-progress-size", "48px");
          break;
        case "large":
          this.style.setProperty("--md-circular-progress-size", "68px");
          break;
      }
    }
  }

  static override styles = [
    ...super.styles,
    css`
      :host {
        --md-sys-color-primary: var(--primary-color);
        --md-circular-progress-size: 48px;
      }
    `,
  ];
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-circular-progress": HaCircularProgress;
  }
}
