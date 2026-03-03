import type { PropertyValues } from "lit";
import { css, LitElement, svg } from "lit";
import { customElement, property, state } from "lit/decorators";
import { styleMap } from "lit/directives/style-map";
import { formatNumber } from "../common/number/format_number";
import { blankBeforePercent } from "../common/translations/blank_before_percent";
import { afterNextRender } from "../common/util/render-status";
import type { FrontendLocaleData } from "../data/translation";
import { getValueInPercentage, normalize } from "../util/calculate";

const getAngle = (value: number, min: number, max: number) => {
  const percentage = getValueInPercentage(normalize(value, min, max), min, max);
  return (percentage * 180) / 100;
};

export interface LevelDefinition {
  level: number;
  stroke: string;
  label?: string;
}

@customElement("ha-gauge")
export class HaGauge extends LitElement {
  @property({ type: Number }) public min = 0;

  @property({ type: Number }) public max = 100;

  @property({ type: Number }) public value = 0;

  @property({ attribute: false })
  public formatOptions?: Intl.NumberFormatOptions;

  @property({ attribute: false }) public valueText?: string;

  @property({ attribute: false }) public locale!: FrontendLocaleData;

  @property({ type: Boolean }) public needle = false;

  @property({ type: Array }) public levels?: LevelDefinition[];

  @property() public label = "";

  @state() private _angle = 0;

  @state() private _updated = false;

  @state() private _segment_label? = "";

  protected firstUpdated(changedProperties: PropertyValues) {
    super.firstUpdated(changedProperties);
    // Wait for the first render for the initial animation to work
    afterNextRender(() => {
      this._updated = true;
      this._angle = getAngle(this.value, this.min, this.max);
      this._segment_label = this._getSegmentLabel();
    });
  }

  protected updated(changedProperties: PropertyValues) {
    super.updated(changedProperties);
    if (
      !this._updated ||
      (!changedProperties.has("value") &&
        !changedProperties.has("valueText") &&
        !changedProperties.has("label") &&
        !changedProperties.has("_segment_label"))
    ) {
      return;
    }
    this._angle = getAngle(this.value, this.min, this.max);
    this._segment_label = this._getSegmentLabel();
  }

  protected render() {
    const arcRadius = 40;
    const arcLength = Math.PI * arcRadius;
    const valueAngle = getAngle(this.value, this.min, this.max);
    const strokeOffset = arcLength * (1 - (valueAngle + 90) / 180);

    return svg`
    <svg viewBox="-50 -50 100 60" class="gauge">
      <path
        class="dial"
        d="M -40 0 A 40 40 0 0 1 40 0"
      />

      ${
        this.levels
          ? this.levels
              .sort((a, b) => a.level - b.level)
              .map((level) => {
                const levelAngle = getAngle(level.level, this.min, this.max);
                return svg`
                  <path
                    class="level"
                    stroke="${level.stroke}"
                    d="M
                      ${-arcRadius * Math.cos((levelAngle * Math.PI) / 180)}
                      ${-arcRadius * Math.sin((levelAngle * Math.PI) / 180)}
                      A ${arcRadius} ${arcRadius} 0 0 1 40 0
                    "
                  />
                `;
              })
          : ""
      }

      ${
        this.needle
          ? svg`
              <path
                class="needle"
                d="M -25 -2.5 L -47.5 0 L -25 2.5 z"
                style=${styleMap({ transform: `rotate(${this._angle}deg)` })}
              />
            `
          : svg`
              <path
                class="value"
                d="M -40 0 A 40 40 0 0 1 40 0"
                stroke-dasharray="${arcLength}"
                stroke-dashoffset="${strokeOffset}"
              />
            `
      }

      <text
        class="value-text"
        x="0"
        y="-10"
        dominant-baseline="middle"
        text-anchor="middle"
      >
        ${
          this._segment_label
            ? this._segment_label
            : this.valueText ||
              formatNumber(this.value, this.locale, this.formatOptions)
        }${
          this._segment_label
            ? ""
            : this.label === "%"
              ? blankBeforePercent(this.locale) + "%"
              : ` ${this.label}`
        }
      </text>
    </svg>
  `;
  }

  private _getSegmentLabel() {
    if (this.levels) {
      this.levels.sort((a, b) => a.level - b.level);
      for (let i = this.levels.length - 1; i >= 0; i--) {
        if (this.value >= this.levels[i].level) {
          return this.levels[i].label;
        }
      }
    }
    return "";
  }

  static styles = css`
    :host {
      position: relative;
    }

    .dial {
      fill: none;
      stroke: var(--primary-background-color);
      stroke-width: 10;
      stroke-linecap: round;
    }

    .value {
      fill: none;
      stroke-width: 10;
      stroke: var(--gauge-color);
      stroke-linecap: round;
      transition: transform 0.8s cubic-bezier(0.34, 1.56, 0.64, 1);
    }

    .needle {
      fill: var(--primary-text-color);
      transition: transform 0.8s cubic-bezier(0.34, 1.56, 0.64, 1);
    }

    .level {
      fill: none;
      stroke-width: 10;
      stroke-linecap: round;
    }
    .value-text {
      fill: var(--primary-text-color);
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-gauge": HaGauge;
  }
}
