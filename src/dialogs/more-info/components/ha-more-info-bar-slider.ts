import { css, CSSResultGroup, html, LitElement, TemplateResult } from "lit";
import { customElement, property } from "lit/decorators";
import "../../../components/ha-bar-slider";

@customElement("ha-more-info-bar-slider")
export class HaTileSlider extends LitElement {
  @property({ type: Boolean })
  public disabled = false;

  @property()
  public mode?: "start" | "end" | "indicator" = "start";

  @property({ type: Number })
  public value?: number;

  @property({ type: Number })
  public step = 1;

  @property({ type: Number })
  public min = 0;

  @property({ type: Number })
  public max = 100;

  @property() public label = "";

  protected render(): TemplateResult {
    return html`
      <ha-bar-slider
        vertical
        .disabled=${this.disabled}
        .mode=${this.mode}
        .value=${this.value}
        .step=${this.step}
        .min=${this.min}
        .max=${this.max}
        aria-labelledby="label"
      >
      </ha-bar-slider>
      <span id="label">${this.label}</span>
    `;
  }

  static get styles(): CSSResultGroup {
    return css`
      ha-bar-slider {
        --slider-bar-thickness: 100px;
        --slider-bar-border-radius: 24px;
        height: 320px;
        --slider-bar-color: var(
          --more-info-slider-bar-color,
          rgb(var(--rgb-primary-color))
        );
        --slider-bar-background: var(
          --more-info-slider-bar-background,
          rgba(var(--rgb-disabled-color), 0.2)
        );
      }
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-more-info-bar-slider": HaTileSlider;
  }
}
