import type { TemplateResult } from "lit";
import { css, html, LitElement } from "lit";
import { customElement, property } from "lit/decorators";
import { styleMap } from "lit/directives/style-map";
import "./ha-tooltip";

export interface Segment {
  value: number;
  color: string;
  label: TemplateResult | string;
}

@customElement("ha-segmented-bar")
class HaSegmentedBar extends LitElement {
  @property({ attribute: false }) public segments!: Segment[];

  @property({ type: String }) public heading!: string;

  @property({ type: String }) public description?: string;

  protected render(): TemplateResult {
    const totalValue = this.segments.reduce(
      (acc, segment) => acc + segment.value,
      0
    );
    return html`
      <div class="container">
        <div class="heading">
          <span>${this.heading}</span>
          <span>${this.description}</span>
        </div>
        <div class="bar">
          ${this.segments.map(
            (segment) => html`
              <ha-tooltip>
                <span slot="content">${segment.label}</span>
                <div
                  style=${styleMap({
                    width: `${(segment.value / totalValue) * 100}%`,
                    backgroundColor: segment.color,
                  })}
                ></div>
              </ha-tooltip>
            `
          )}
        </div>
        <ul class="legend">
          ${this.segments.map(
            (segment) => html`
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
          )}
        </ul>
      </div>
    `;
  }

  static styles = css`
    .container {
      width: 100%;
    }
    .heading span {
      color: var(--secondary-text-color);
      line-height: var(--ha-line-height-expanded);
      margin-right: 8px;
    }
    .heading span:first-child {
      color: var(--primary-text-color);
    }
    .bar {
      display: flex;
      overflow: hidden;
      border-radius: var(--ha-bar-border-radius, 4px);
      width: 100%;
      height: 12px;
      margin: 2px 0;
      background-color: var(
        --ha-bar-background-color,
        var(--secondary-background-color)
      );
    }
    .bar > div {
      height: 100%;
    }
    .bar > div:hover {
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
      border-radius: 50%;
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-segmented-bar": HaSegmentedBar;
  }
}
