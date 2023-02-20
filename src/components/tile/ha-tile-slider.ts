import { css, CSSResultGroup, html, LitElement, TemplateResult } from "lit";
import { customElement, property } from "lit/decorators";
import { ifDefined } from "lit/directives/if-defined";
import "../ha-control-slider";

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
      <ha-control-slider
        .disabled=${this.disabled}
        .mode=${this.mode}
        .value=${this.value}
        .step=${this.step}
        .min=${this.min}
        .max=${this.max}
        aria-label=${ifDefined(this.label)}
        .showHandle=${this.showHandle}
      >
      </ha-control-slider>
    `;
  }

  static get styles(): CSSResultGroup {
    return css`
      ha-control-slider {
        --control-slider-color: var(--tile-slider-color, var(--primary-color));
        --control-slider-background: var(
          --tile-slider-background,
          var(--disabled-color)
        );
        --control-slider-background-opacity: var(
          --tile-slider-background-opacity,
          0.2
        );
        --control-slider-thickness: 40px;
        --control-slider-border-radius: 10px;
      }
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-tile-slider": HaTileSlider;
  }
}
