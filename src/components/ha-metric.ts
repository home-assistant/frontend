import { css, CSSResultGroup, html, LitElement, TemplateResult } from "lit";
import { customElement, property } from "lit/decorators";
import { classMap } from "lit/directives/class-map";
import { roundWithOneDecimal } from "../util/calculate";
import "./ha-bar";
import "./ha-settings-row";

@customElement("ha-metric")
class HaMetric extends LitElement {
  @property({ type: Number }) public value!: number;

  @property({ type: String }) public heading!: string;

  @property({ type: String }) public tooltip?: string;

  protected render(): TemplateResult {
    const roundedValue = roundWithOneDecimal(this.value);
    return html`
      <ha-settings-row>
        <span slot="heading"> ${this.heading} </span>
        <div slot="description" .title=${this.tooltip ?? ""}>
          <span class="value"> ${roundedValue} % </span>
          <ha-bar
            class=${classMap({
              "target-warning": roundedValue > 50,
              "target-critical": roundedValue > 85,
            })}
            .value=${this.value}
          ></ha-bar>
        </div>
      </ha-settings-row>
    `;
  }

  static get styles(): CSSResultGroup {
    return css`
      ha-settings-row {
        padding: 0;
        height: 54px;
        width: 100%;
      }
      ha-settings-row > div[slot="description"] {
        white-space: normal;
        color: var(--secondary-text-color);
        display: flex;
        justify-content: space-between;
      }
      ha-bar {
        --ha-bar-primary-color: var(
          --metric-bar-ok-color,
          var(--success-color)
        );
      }
      .target-warning {
        --ha-bar-primary-color: var(
          --metric-bar-warning-color,
          var(--warning-color)
        );
      }
      .target-critical {
        --ha-bar-primary-color: var(
          --metric-bar-critical-color,
          var(--error-color)
        );
      }
      .value {
        width: 48px;
        padding-right: 4px;
        flex-shrink: 0;
      }
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-metric": HaMetric;
  }
}
