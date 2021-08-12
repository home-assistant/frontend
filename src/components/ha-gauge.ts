import { css, LitElement, PropertyValues, svg } from "lit";
import { customElement, property, state } from "lit/decorators";
import { ifDefined } from "lit/directives/if-defined";
import { styleMap } from "lit/directives/style-map";
import { formatNumber } from "../common/string/format_number";
import { afterNextRender } from "../common/util/render-status";
import { FrontendLocaleData } from "../data/translation";
import { getValueInPercentage, normalize } from "../util/calculate";
import { isSafari } from "../util/is_safari";

const getAngle = (value: number, min: number, max: number) => {
  const percentage = getValueInPercentage(normalize(value, min, max), min, max);
  return (percentage * 180) / 100;
};

export interface LevelDefinition {
  level: number;
  stroke: string;
}

@customElement("ha-gauge")
export class Gauge extends LitElement {
  @property({ type: Number }) public min = 0;

  @property({ type: Number }) public max = 100;

  @property({ type: Number }) public value = 0;

  @property({ type: String }) public valueText?: string;

  @property() public locale!: FrontendLocaleData;

  @property({ type: Boolean }) public needle?: boolean;

  @property() public levels?: LevelDefinition[];

  @property() public label = "";

  @state() private _angle = 0;

  @state() private _updated = false;

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
        ${
          !this.needle || !this.levels
            ? svg`<path
          class="dial"
          d="M 10 50 A 40 40 0 0 1 90 50"
        ></path>`
            : ""
        }

        ${
          this.levels
            ? this.levels
                .sort((a, b) => a.level - b.level)
                .map((level) => {
                  const angle = getAngle(level.level, this.min, this.max);
                  return svg`<path
                      stroke="${level.stroke}"
                      class="level"
                      d="M
                        ${50 - 40 * Math.cos((angle * Math.PI) / 180)}
                        ${50 - 40 * Math.sin((angle * Math.PI) / 180)}
                       A 40 40 0 0 1 90 50
                      "
                    ></path>`;
                })
            : ""
        }
        ${
          this.needle
            ? svg`<path
                class="needle"
                d="M 25 47.5 L 2.5 50 L 25 52.5 z"
                style=${ifDefined(
                  !isSafari
                    ? styleMap({ transform: `rotate(${this._angle}deg)` })
                    : undefined
                )}
                transform=${ifDefined(
                  isSafari ? `rotate(${this._angle} 50 50)` : undefined
                )}
              >
              `
            : svg`<path
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
              >`
        }
        ${
          // Workaround for https://github.com/home-assistant/frontend/issues/6467
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
          ${this.valueText || formatNumber(this.value, this.locale)} ${
      this.label
    }
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
      .needle {
        fill: var(--primary-text-color);
        transform-origin: 50% 100%;
        transition: all 1s ease 0s;
      }
      .level {
        fill: none;
        stroke-width: 15;
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
