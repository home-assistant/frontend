import type { PropertyValues } from "lit";
import { css, LitElement, nothing } from "lit";
import { customElement, property } from "lit/decorators";

@customElement("ha-chart-tooltip-marker")
class HaChartTooltipMarker extends LitElement {
  @property() public color = "";

  @property({ type: Boolean, reflect: true }) public rtl = false;

  protected willUpdate(changed: PropertyValues) {
    if (changed.has("color")) {
      this.style.backgroundColor = this.color;
    }
  }

  protected render() {
    return nothing;
  }

  static styles = css`
    :host {
      display: inline-block;
      margin-inline-end: 4px;
      margin-inline-start: initial;
      border-radius: 10px;
      width: 10px;
      height: 10px;
      vertical-align: middle;
    }
    :host([rtl]) {
      direction: rtl;
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-chart-tooltip-marker": HaChartTooltipMarker;
  }
}
