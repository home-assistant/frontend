import type { TemplateResult } from "lit";
import { css, html, LitElement, nothing } from "lit";
import { customElement, property } from "lit/decorators";
import { classMap } from "lit/directives/class-map";
import { styleMap } from "lit/directives/style-map";
import { fireEvent } from "../common/dom/fire_event";
import "./ha-tooltip";

export interface Segment {
  value: number;
  color: string;
  label?: TemplateResult | string;
  entityId?: string;
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

  @property({ type: Boolean }) public clickable = false;

  @property({ type: Boolean, attribute: "bar-clickable" })
  public barClickable = false;

  @property({ attribute: false })
  public hiddenSegments?: number[];

  protected render(): TemplateResult {
    const totalValue = this.segments.reduce((acc, segment, index) => {
      if (this.hiddenSegments?.includes(index)) return acc;
      return acc + segment.value;
    }, 0);
    return html`
      <div class="container">
        ${this.heading || this.description
          ? html`
              <div class="heading">
                <div class="title">
                  <span>${this.heading}</span>
                  <span>${this.description}</span>
                </div>
                <slot name="extra"></slot>
              </div>
            `
          : nothing}
        <div class="bar">
          ${this.segments.map(
            (segment, index) => html`
              ${this.hideTooltip || !segment.label
                ? nothing
                : html`
                    <ha-tooltip for="segment-${index}" placement="top">
                      ${segment.label}
                    </ha-tooltip>
                  `}
              <div
                id="segment-${index}"
                class=${classMap({ clickable: this.barClickable })}
                data-index=${index}
                @click=${this.barClickable ? this._handleSegmentClick : nothing}
                style=${styleMap({
                  width: `${(segment.value / totalValue) * 100}%`,
                  backgroundColor: segment.color,
                  display: this.hiddenSegments?.includes(index)
                    ? "none"
                    : "block",
                })}
              ></div>
            `
          )}
        </div>
        ${this.hideLegend
          ? nothing
          : html`
              <ul class="legend">
                ${this.segments.map((segment, index) =>
                  segment.label
                    ? html`
                        <li
                          class=${classMap({
                            clickable: this.clickable,
                            hidden: this.hiddenSegments?.includes(index),
                          })}
                          data-index=${index}
                          @click=${this.clickable
                            ? this._handleLegendClick
                            : nothing}
                        >
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

  private _handleSegmentClick(ev: Event): void {
    const target = ev.currentTarget as HTMLElement;
    const index = Number(target.dataset.index);
    const segment = this.segments[index];
    if (segment) {
      fireEvent(this, "segment-clicked", { index, segment });
    }
  }

  private _handleLegendClick(ev: Event): void {
    const target = ev.currentTarget as HTMLElement;
    const index = Number(target.dataset.index);
    const segment = this.segments[index];
    if (segment) {
      fireEvent(this, "legend-item-clicked", { index, segment });
    }
  }

  static styles = css`
    .container {
      width: 100%;
    }
    .heading {
      display: flex;
      flex-direction: row;
      gap: var(--ha-space-2);
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
    .bar div.clickable {
      cursor: pointer;
    }
    .bar div.clickable:hover {
      opacity: 0.8;
    }
    .legend {
      display: flex;
      flex-direction: row;
      flex-wrap: wrap;
      gap: var(--ha-space-3);
      margin: 12px 0;
      padding: 0;
      list-style: none;
    }
    .legend li {
      display: flex;
      align-items: center;
      gap: var(--ha-space-1);
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
    .legend li.clickable {
      cursor: pointer;
    }
    .legend li.clickable:hover {
      opacity: 0.8;
    }
    .legend li.hidden {
      opacity: 0.5;
    }
    .legend li.hidden .label {
      text-decoration: line-through;
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-segmented-bar": HaSegmentedBar;
  }
  interface HASSDomEvents {
    "segment-clicked": { index: number; segment: Segment };
    "legend-item-clicked": { index: number; segment: Segment };
  }
}
