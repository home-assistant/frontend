import { css, CSSResultGroup, html, LitElement, TemplateResult } from "lit";
import { customElement, property } from "lit/decorators";
import { ifDefined } from "lit/directives/if-defined";
import "../../../components/ha-bar-slider";

@customElement("ha-more-info-bar-slider")
export class HaTileSlider extends LitElement {
  @property({ type: Boolean, reflect: true })
  public disabled = false;

  @property()
  public mode?: "start" | "end" | "cursor" = "start";

  @property()
  public valueFormatter?: (value?: number) => string | TemplateResult;

  @property({ type: Number })
  public value?: number;

  @property({ type: Number })
  public step = 1;

  @property({ type: Number })
  public min = 0;

  @property({ type: Number })
  public max = 100;

  @property({ type: Boolean, attribute: "show-handle" })
  public showHandle = false;

  @property() public label = "";

  @property({ type: Boolean, attribute: "show-label" })
  public showLabel = false;

  @property({ type: Boolean, attribute: "show-value" })
  public showValue = false;

  protected render(): TemplateResult {
    return html`
      <div class="container">
        ${this.showValue
          ? html`
              <p>
                ${this.valueFormatter
                  ? this.valueFormatter(this.value)
                  : this.value}
              </p>
            `
          : null}
        <ha-bar-slider
          vertical
          .disabled=${this.disabled}
          .mode=${this.mode}
          .value=${this.value}
          .step=${this.step}
          .min=${this.min}
          .max=${this.max}
          .showHandle=${this.showHandle}
          aria-labelledby=${ifDefined(this.showLabel ? "label" : undefined)}
          aria-label=${ifDefined(
            !this.showLabel && this.label ? this.label : undefined
          )}
        >
        </ha-bar-slider>
        ${this.showLabel ? html`<p id="label">${this.label}</p>` : null}
      </div>
    `;
  }

  static get styles(): CSSResultGroup {
    return css`
      .container {
        display: flex;
        align-items: center;
        flex-direction: column;
      }
      ha-bar-slider {
        height: var(--more-info-slider-bar-height, 330px);
        --slider-bar-thickness: 100px;
        --slider-bar-border-radius: 24px;
        --slider-bar-color: var(
          --more-info-slider-bar-color,
          var(--primary-color)
        );
        --slider-bar-background: var(
          --more-info-slider-bar-background,
          var(--disabled-color)
        );
        --slider-bar-background-opacity: var(
          --more-info-slider-bar-background-opacity,
          0.2
        );
      }
      p {
        font-weight: 500;
        font-size: 14px;
        line-height: 20px;
        text-align: center;
        margin: 16px 0;
      }
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-more-info-bar-slider": HaTileSlider;
  }
}
