import { MdCircularProgress } from "@material/web/progress/circular-progress";
import { CSSResult, css } from "lit";
import { customElement, property } from "lit/decorators";

@customElement("ha-circular-progress")
export class HaCircularProgress extends MdCircularProgress {
  @property({ attribute: "aria-label", type: String }) public ariaLabel =
    "Loading";

  @property() public size: "tiny" | "small" | "medium" | "large" = "medium";

  public firstUpdated(changedProperties) {
    super.firstUpdated(changedProperties);

    switch (this.size) {
      case "tiny":
        this.style.setProperty("--md-circular-progress-size", "16px");
        break;
      case "small":
        this.style.setProperty("--md-circular-progress-size", "28px");
        break;
      // medium is default size
      case "large":
        this.style.setProperty("--md-circular-progress-size", "68px");
        break;
    }
  }

  static get styles(): CSSResult[] {
    return [
      ...super.styles,
      css`
        :host {
          --md-sys-color-primary: var(--primary-color);
          --md-circular-progress-size: 48px;
        }
      `,
    ];
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-circular-progress": HaCircularProgress;
  }
}
