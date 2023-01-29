import { css, CSSResultGroup, html, LitElement, TemplateResult } from "lit";
import { customElement, property } from "lit/decorators";
import { ifDefined } from "lit/directives/if-defined";
import "../ha-bar-slider";

@customElement("ha-tile-slider")
export class HaTileSlider extends LitElement {
  @property({ type: Boolean })
  public disabled = false;

  @property()
  public mode?: "start" | "end" | "cursor" = "start";

  @property({ type: Boolean, attribute: "show-handle" })
  public showHandle = false;

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
        .showHandle=${this.showHandle}
      >
      </ha-bar-slider>
    `;
  }

  static get styles(): CSSResultGroup {
    return css`
      ha-bar-slider {
        --slider-bar-color: var(--tile-slider-color, var(--primary-color));
        --slider-bar-background: var(
          --tile-slider-background,
          var(--disabled-color)
        );
        --slider-bar-background-opacity: var(
          --tile-slider-background-opacity,
          0.2
        );
        --slider-bar-thickness: 40px;
        --slider-bar-border-radius: 10px;
      }
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-tile-slider": HaTileSlider;
  }
}
