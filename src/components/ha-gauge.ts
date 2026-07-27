import { IntersectionController } from "@lit-labs/observers/intersection-controller.js";
import type { PropertyValues } from "lit";
import { css, LitElement, svg } from "lit";
import { customElement, property, query, state } from "lit/decorators";
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

  @query(".text") private _textSvg?: SVGSVGElement;

  @query(".value-text") private _valueText?: SVGTextElement;

  private _sortedLevels?: LevelDefinition[];

  // Set when the value text could not be measured because we have no layout box
  // yet, either disconnected or inside a hidden container.
  private _rescalePending = false;

  // Measure again once we become visible, e.g. when a section hidden by a
  // visibility condition is revealed. Nothing else re-renders the gauge then,
  // and a resize observer would stay silent because the size we get back is the
  // same one it last reported.
  // @ts-ignore side-effect-only controller, its value is never read
  private _intersectionController = new IntersectionController(this, {
    callback: (entries) => {
      if (
        this._rescalePending &&
        entries.some((entry) => entry.isIntersecting)
      ) {
        this._rescaleSvg();
      }
    },
  });

  public connectedCallback(): void {
    super.connectedCallback();
    if (this._rescalePending && this.hasUpdated) {
      this._rescaleSvg();
    }
  }

  protected firstUpdated(changedProperties: PropertyValues<this>) {
    super.firstUpdated(changedProperties);
    afterNextRender(() => {
      this._updated = true;
      if (this.needle) {
        this._angle = getAngle(this.value, this.min, this.max);
      }
      this._segment_label = this._getSegmentLabel();
      this._rescaleSvg();
    });
  }

  protected willUpdate(changedProperties: PropertyValues<this>) {
    if (changedProperties.has("levels") || changedProperties.has("min")) {
      if (this.levels) {
        this._sortedLevels = [...this.levels].sort((a, b) => a.level - b.level);

        if (
          this._sortedLevels.length > 0 &&
          this._sortedLevels[0].level !== this.min
        ) {
          this._sortedLevels.unshift({
            level: this.min,
            stroke: "var(--info-color)",
          });
        }
      } else {
        this._sortedLevels = undefined;
      }
    }
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
    this._rescaleSvg();
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


        ${this._sortedLevels?.map((level, i, arr) => {
          const startLevel = level.level;
          const endLevel = i + 1 < arr.length ? arr[i + 1].level : this.max;

          const startAngle = getAngle(startLevel, this.min, this.max);
          const endAngle = getAngle(endLevel, this.min, this.max);
          const largeArc = endAngle - startAngle > 180 ? 1 : 0;

          const x1 = -arcRadius * Math.cos((startAngle * Math.PI) / 180);
          const y1 = -arcRadius * Math.sin((startAngle * Math.PI) / 180);

          const isFirst = i === 0;
          const isLast = i === arr.length - 1;

          if (isFirst) {
            return svg`
              <path
                class="level"
                stroke="${level.stroke}"
                style="stroke-linecap: butt"
                d="M ${x1} ${y1} A ${arcRadius} ${arcRadius} 0 ${largeArc} 1 40 0"
              />
            `;
          }

          if (isLast) {
            const offsetAngle = 0.5;
            const midAngle = endAngle - offsetAngle;
            const xm = -arcRadius * Math.cos((midAngle * Math.PI) / 180);
            const ym = -arcRadius * Math.sin((midAngle * Math.PI) / 180);

            return svg`
                <path class="level" stroke="${level.stroke}" style="stroke-linecap: butt"
                      d="M ${x1} ${y1} A ${arcRadius} ${arcRadius} 0 ${largeArc} 1 40 0" />
                <path class="level" stroke="${level.stroke}" style="stroke-linecap: butt"
                      d="M ${xm} ${ym} A ${arcRadius} ${arcRadius} 0 0 1 40 0" />
            `;
          }

          return svg`
            <path
              class="level"
              stroke="${level.stroke}"
              style="stroke-linecap: butt"
              d="M ${x1} ${y1} A ${arcRadius} ${arcRadius} 0 ${largeArc} 1 40 0"
            ></path>
          `;
        })}

        ${
          this.needle
            ? svg`
                <path
                class="needle"
                d="M -34,-3 L -40,-1 A 1,1,0,0,0,-40,1 L -34,3 A 2,2,0,0,0,-34,-3 Z"

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
      </svg>
      <svg class="text">
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

  private _rescaleSvg() {
    // Set the viewbox of the SVG containing the value to perfectly
    // fit the text
    // That way it will auto-scale correctly

    if (!this._textSvg || !this._valueText || !this.isConnected) {
      this._rescalePending = true;
      return;
    }

    const box = this._valueText.getBBox();

    // An empty box means we have no layout, so keep the last known good viewBox
    // and retry later. A viewBox with a 0 width or height would hide the label.
    if (!box.width || !box.height) {
      this._rescalePending = true;
      return;
    }

    this._rescalePending = false;
    this._textSvg.setAttribute(
      "viewBox",
      `${box.x} ${box.y} ${box.width} ${box.height}`
    );
  }

  private _getSegmentLabel() {
    if (this._sortedLevels) {
      for (let i = this._sortedLevels.length - 1; i >= 0; i--) {
        if (this.value >= this._sortedLevels[i].level) {
          return this._sortedLevels[i].label;
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
      stroke-width: 12;
      stroke-linecap: butt;
    }

    .level {
      fill: none;
      stroke-width: 12;
      stroke-linecap: butt;
    }

    .value {
      fill: none;
      stroke-width: 12;
      stroke: var(--gauge-color);
      stroke-linecap: butt;
      transition: stroke-dashoffset 1s ease 0s;
    }

    .needle {
      fill: var(--primary-text-color);
      stroke: var(--card-background-color);
      color: var(--primary-text-color);
      stroke-width: 1;
      stroke-linecap: round;
      transform-origin: 0 0;
      transition: all 1s ease 0s;
    }

    .text {
      position: absolute;
      max-height: 40%;
      max-width: 55%;
      left: 50%;
      bottom: 10%;
      transform: translate(-50%, 0%);
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
