import type { TemplateResult } from "lit";
import { css, html, LitElement, nothing } from "lit";
import { customElement, property } from "lit/decorators";
import { styleMap } from "lit/directives/style-map";
import "./ha-tooltip";

export interface Segment {
  value: number;
  color: string;
  label?: TemplateResult | string;
}

@customElement("ha-segmented-bar")
class HaSegmentedBar extends LitElement {
  @property({ attribute: false }) public segments!: Segment[];

  @property({ type: String }) public heading!: string;

  @property({ type: String }) public description?: string;

  @property({ type: Boolean, attribute: "hide-legend" })
  public hideLegend = false;

  @property({ type: Boolean, attribute: "hide-tooltip" })
  public hideTooltip = false;

  protected render(): TemplateResult {
    const totalValue = this.segments.reduce(
      (acc, segment) => acc + segment.value,
      0
    );
    return html`
      <div class="container">
        <div class="heading">
          <div class="title">
            <span>${this.heading}</span>
            <span>${this.description}</span>
          </div>
          <slot name="extra"></slot>
        </div>
        <div class="bar">
          ${this.segments.map((segment) => {
            const bar = html`<div
              style=${styleMap({
                width: `${(segment.value / totalValue) * 100}%`,
                backgroundColor: segment.color,
              })}
            ></div>`;
            return this.hideTooltip && !segment.label
              ? bar
              : html`
                  <ha-tooltip>
                    <span slot="content">${segment.label}</span>
                    ${bar}
                  </ha-tooltip>
                `;
          })}
        </div>
        ${this.hideLegend
          ? nothing
          : html`
              <ul class="legend">
                ${this.segments.map((segment) =>
                  segment.label
                    ? html`
                        <li>
                          <div
                            class="bullet"
                            style=${styleMap({
                              backgroundColor: segment.color,
                            })}
                          ></div>
                          <span class="label">${segment.label}</span>
                        </li>
                      `
                    : nothing
                )}
              </ul>
            `}
      </div>
    `;
  }

  static styles = css`
    .container {
      width: 100%;
    }
    .heading {
      display: flex;
      flex-direction: row;
      gap: 8px;
    }
    .heading .title {
      flex: 1;
    }
    .heading .title span {
      color: var(--secondary-text-color);
      line-height: var(--ha-line-height-expanded);
      margin-right: 8px;
    }
    .heading .title span:first-child {
      color: var(--primary-text-color);
    }
    .bar {
      display: flex;
      overflow: hidden;
      border-radius: var(--ha-bar-border-radius, var(--ha-border-radius-sm));
      width: 100%;
      height: 12px;
      margin: 2px 0;
      background-color: var(
        --ha-bar-background-color,
        var(--secondary-background-color)
      );
    }
    .bar div {
      height: 100%;
    }
    .bar div:hover {
      opacity: 0.8;
    }
    .legend {
      display: flex;
      flex-direction: row;
      flex-wrap: wrap;
      gap: 12px;
      margin: 12px 0;
      padding: 0;
      list-style: none;
    }
    .legend li {
      display: flex;
      align-items: center;
      gap: 4px;
      font-size: var(--ha-font-size-s);
    }
    .legend li .bullet {
      width: 12px;
      height: 12px;
      border-radius: var(--ha-border-radius-circle);
    }
    .spacer {
      flex: 1;
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-segmented-bar": HaSegmentedBar;
  }
}
