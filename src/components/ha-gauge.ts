import {
  LitElement,
  svg,
  customElement,
  css,
  property,
  internalProperty,
  PropertyValues,
} from "lit-element";
import { styleMap } from "lit-html/directives/style-map";
import { afterNextRender } from "../common/util/render-status";
import { ifDefined } from "lit-html/directives/if-defined";

const getAngle = (value: number, min: number, max: number) => {
  const percentage = getValueInPercentage(normalize(value, min, max), min, max);
  return (percentage * 180) / 100;
};

const normalize = (value: number, min: number, max: number) => {
  if (value > max) return max;
  if (value < min) return min;
  return value;
};

const getValueInPercentage = (value: number, min: number, max: number) => {
  const newMax = max - min;
  const newVal = value - min;
  return (100 * newVal) / newMax;
};

// Workaround for https://github.com/home-assistant/frontend/issues/6467
const isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent);

@customElement("ha-gauge")
export class Gauge extends LitElement {
  @property({ type: Number }) public min = 0;

  @property({ type: Number }) public max = 100;

  @property({ type: Number }) public value = 0;

  @property() public label = "";

  @internalProperty() private _angle = 0;

  @internalProperty() private _updated = false;

  protected firstUpdated(changedProperties: PropertyValues) {
    super.firstUpdated(changedProperties);
    // Wait for the first render for the initial animation to work
    afterNextRender(() => {
      this._updated = true;
      this._angle = getAngle(this.value, this.min, this.max);
      this._rescale_svg();
    });
  }

  protected updated(changedProperties: PropertyValues) {
    super.updated(changedProperties);
    if (!this._updated || !changedProperties.has("value")) {
      return;
    }
    this._angle = getAngle(this.value, this.min, this.max);
    this._rescale_svg();
  }

  protected render() {
    return svg`
      <svg viewBox="0 0 100 50" class="gauge">
        <path
          class="dial"
          d="M 10 50 A 40 40 0 0 1 90 50"
        ></path>
        <path
          class="value"
          d="M 90 50.001 A 40 40 0 0 1 10 50"
          style=${ifDefined(
            !isSafari
              ? styleMap({ transform: `rotate(${this._angle}deg)` })
              : undefined
          )}
          transform=${ifDefined(
            isSafari ? `rotate(${this._angle} 50 50)` : undefined
          )}
        >
        ${
          isSafari
            ? svg`<animateTransform
                attributeName="transform"
                type="rotate"
                from="0 50 50"
                to="${this._angle} 50 50"
                dur="1s"
              />`
            : ""
        }
        </path>
      </svg>
      <svg class="text">
        <text class="value-text">
          ${this.value} ${this.label}
        </text>
      </svg>`;
  }

  private _rescale_svg() {
    // Set the viewbox of the SVG containing the value to perfectly
    // fit the text
    // That way it will auto-scale correctly
    const svgRoot = this.shadowRoot!.querySelector(".text")!;
    const box = svgRoot.querySelector("text")!.getBBox()!;
    svgRoot.setAttribute(
      "viewBox",
      `${box.x} ${box!.y} ${box.width} ${box.height}`
    );
  }

  static get styles() {
    return css`
      :host {
        position: relative;
      }
      .dial {
        fill: none;
        stroke: var(--primary-background-color);
        stroke-width: 15;
      }
      .value {
        fill: none;
        stroke-width: 15;
        stroke: var(--gauge-color);
        transform-origin: 50% 100%;
        transition: all 1s ease 0s;
      }
      .gauge {
        display: block;
      }
      .text {
        position: absolute;
        max-height: 40%;
        max-width: 55%;
        left: 50%;
        bottom: -6%;
        transform: translate(-50%, 0%);
      }
      .value-text {
        font-size: 50px;
        fill: var(--primary-text-color);
        text-anchor: middle;
      }
    `;
  }
}
