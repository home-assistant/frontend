import { css, LitElement, nothing } from "lit";
import type { PropertyValues } from "lit";
import { customElement, property } from "lit/decorators";
import { computeCssColor } from "../../../common/color/compute-color";
import {
  DEFAULT_SECTION_BACKGROUND_OPACITY,
  type LovelaceSectionBackgroundConfig,
} from "../../../data/lovelace/config/section";

@customElement("hui-section-background")
export class HuiSectionBackground extends LitElement {
  @property({ attribute: false })
  public background?: LovelaceSectionBackgroundConfig;

  protected render() {
    return nothing;
  }

  protected willUpdate(changedProperties: PropertyValues<this>) {
    super.willUpdate(changedProperties);
    if (changedProperties.has("background") && this.background) {
      const color = this.background.color
        ? computeCssColor(this.background.color)
        : "var(--ha-section-background-color, var(--secondary-background-color))";
      this.style.setProperty("--section-background", color);
      const opacity =
        this.background.opacity ?? DEFAULT_SECTION_BACKGROUND_OPACITY;
      this.style.setProperty("--section-background-opacity", `${opacity}%`);
    }
  }

  static styles = css`
    :host {
      position: absolute;
      inset: 0;
      border-radius: inherit;
      background-color: var(--section-background, none);
      opacity: var(--section-background-opacity, 100%);
      z-index: 0;
      pointer-events: none;
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    "hui-section-background": HuiSectionBackground;
  }
}
