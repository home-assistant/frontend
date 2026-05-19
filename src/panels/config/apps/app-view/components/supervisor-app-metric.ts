import type { TemplateResult } from "lit";
import { css, html, LitElement } from "lit";
import { customElement, property } from "lit/decorators";
import { classMap } from "lit/directives/class-map";
import "../../../../../components/ha-bar";
import "../../../../../components/item/ha-row-item";
import { roundWithOneDecimal } from "../../../../../util/calculate";

@customElement("supervisor-app-metric")
class SupervisorAppMetric extends LitElement {
  @property({ type: Number }) public value!: number;

  @property({ type: String }) public description!: string;

  @property({ type: String }) public tooltip?: string;

  protected render(): TemplateResult {
    const roundedValue = roundWithOneDecimal(this.value);
    return html`<ha-row-item empty>
      <span slot="headline"> ${this.description} </span>
      <div slot="supporting-text" .title=${this.tooltip ?? ""}>
        <span class="value"> ${roundedValue} % </span>
        <ha-bar
          class=${classMap({
            "target-warning": roundedValue > 50,
            "target-critical": roundedValue > 85,
          })}
          .value=${this.value}
        ></ha-bar>
      </div>
    </ha-row-item>`;
  }

  static styles = css`
    ha-row-item {
      width: 100%;
    }
    ha-row-item > div[slot="supporting-text"] {
      white-space: normal;
      color: var(--secondary-text-color);
      display: flex;
      justify-content: space-between;
    }
    ha-bar {
      --ha-bar-primary-color: var(--hassio-bar-ok-color, var(--success-color));
    }
    .target-warning {
      --ha-bar-primary-color: var(
        --hassio-bar-warning-color,
        var(--warning-color)
      );
    }
    .target-critical {
      --ha-bar-primary-color: var(
        --hassio-bar-critical-color,
        var(--error-color)
      );
    }
    .value {
      width: 48px;
      padding-right: var(--ha-space-1);
      padding-inline-start: initial;
      padding-inline-end: var(--ha-space-1);
      flex-shrink: 0;
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    "supervisor-app-metric": SupervisorAppMetric;
  }
}
