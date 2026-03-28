import type { PropertyValues, TemplateResult } from "lit";
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

  @state() private _segment_label?: string = "";

  protected firstUpdated(changedProperties: PropertyValues) {
    super.firstUpdated(changedProperties);
    afterNextRender(() => {
      this._updated = true;
      if (this.needle) {
        this._angle = getAngle(this.value, this.min, this.max);
      }
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
    const strokeOffset = this._updated
      ? arcLength * (1 - valueAngle / 180)
      : arcLength;

    return svg`
      <svg viewBox="-50 -50 100 55" class="gauge">
        <path
          class="levels-base"
          d="M -40 0 A 40 40 0 0 1 40 0"
        />


  ${
    this.levels
      ? [...this.levels]
          .sort((a, b) => a.level - b.level)
          .map((level, i, arr) => {
            const startLevel = i === 0 ? this.min : arr[i].level;
            const endLevel = i + 1 < arr.length ? arr[i + 1].level : this.max;

            const startAngle = getAngle(startLevel, this.min, this.max);
            const endAngle = getAngle(endLevel, this.min, this.max);
            const largeArc = endAngle - startAngle > 180 ? 1 : 0;

            const x1 = -arcRadius * Math.cos((startAngle * Math.PI) / 180);
            const y1 = -arcRadius * Math.sin((startAngle * Math.PI) / 180);
            const x2 = -arcRadius * Math.cos((endAngle * Math.PI) / 180);
            const y2 = -arcRadius * Math.sin((endAngle * Math.PI) / 180);

            const firstSegment = i === 0;
            const lastSegment = i === arr.length - 1;

            const paths: TemplateResult[] = [];

            if (firstSegment) {
              paths.push(svg`
              <path
                class="level"
                stroke="${level.stroke}"
                style="stroke-linecap: round"
                d="M ${x1} ${y1} A ${arcRadius} ${arcRadius} 0 ${largeArc} 1 ${x2} ${y2}"
              />
            `);
            } else if (lastSegment) {
              const offsetAngle = 0.5;
              const midAngle = endAngle - offsetAngle;
              const xm = -arcRadius * Math.cos((midAngle * Math.PI) / 180);
              const ym = -arcRadius * Math.sin((midAngle * Math.PI) / 180);

              paths.push(svg`
                <path
                  class="level"
                  stroke="${level.stroke}"
                  style="stroke-linecap: butt"
                  d="M ${x1} ${y1} A ${arcRadius} ${arcRadius} 0 ${largeArc} 1 ${xm} ${ym}"
                />
              `);

              paths.push(svg`
                <path
                  class="level"
                  stroke="${level.stroke}"
                  style="stroke-linecap: round"
                  d="M ${xm} ${ym} A ${arcRadius} ${arcRadius} 0 0 1 ${x2} ${y2}"
                />
              `);
            } else {
              paths.push(svg`
                <path
                  class="level"
                  stroke="${level.stroke}"
                  style="stroke-linecap: butt"
                  d="M ${x1} ${y1} A ${arcRadius} ${arcRadius} 0 ${largeArc} 1 ${x2} ${y2}"
                />
              `);
            }

            return paths;
          })
      : ""
  }

        ${
          this.needle
            ? svg`
                <line
                  class="needle"
                  x1="-35.0"
                  y1="0"
                  x2="-45.0"
                  y2="0"
                  style=${styleMap({ transform: `rotate(${this._angle}deg)` })}
                />
              `
            : svg`
                <path
                  class="value"
                  d="M -40 0 A 40 40 0 0 1 40 0"
                  stroke-dasharray="${arcLength}"
                  style=${styleMap({ strokeDashoffset: `${strokeOffset}` })}
                />
              `
        }

        <text
          class="value-text"
          x="0"
          y="-5"
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
      [...this.levels].sort((a, b) => a.level - b.level);
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

    .levels-base {
      fill: none;
      stroke: var(--primary-background-color);
      stroke-width: 8;
      stroke-linecap: round;
    }

    .level {
      fill: none;
      stroke-width: 8;
      stroke-linecap: butt;
    }

    .value {
      fill: none;
      stroke-width: 8;
      stroke: var(--gauge-color);
      stroke-linecap: round;
      transition: stroke-dashoffset 1s ease 0s;
    }

    .needle {
      stroke: var(--primary-text-color);
      stroke-width: 2;
      stroke-linecap: round;
      transform-origin: 0 0;
      transition: all 1s ease 0s;
    }

    .value-text {
      font-size: var(--ha-font-size-l);
      fill: var(--primary-text-color);
      direction: ltr;
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-gauge": HaGauge;
  }
}
