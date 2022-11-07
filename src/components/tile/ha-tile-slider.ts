import { css, CSSResultGroup, html, TemplateResult } from "lit";
import { customElement, property } from "lit/decorators";
import { ifDefined } from "lit/directives/if-defined";
import { HaBarSlider } from "../ha-bar-slider";

@customElement("ha-tile-slider")
export class HaTileSlider extends HaBarSlider {
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

  @property() public label?: string;

  protected render(): TemplateResult {
    return html`
      <ha-bar-slider
        .disabled=${this.disabled}
        .mode=${this.mode}
        .value=${this.value}
        .step=${this.step}
        .min=${this.min}
        .max=${this.max}
        aria-label=${ifDefined(this.label)}
      >
      </ha-bar-slider>
    `;
  }

  static get styles(): CSSResultGroup {
    return css`
      ha-bar-slider {
        --slider-bar-color: var(
          --tile-slider-bar-color,
          rgb(var(--rgb-primary-color))
        );
        --slider-bar-background: var(
          --tile-slider-bar-background,
          rgba(var(--rgb-disabled-color), 0.2)
        );
      }
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-tile-slider": HaTileSlider;
  }
}
