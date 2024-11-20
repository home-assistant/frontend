import { customElement, property } from "lit/decorators";
import { LitElement, html } from "lit";

type SankeyChartData = {
  nodes: { id: string; label: string; color?: string; value: number }[];
  links: { source: string; target: string; value: number }[];
};

@customElement("sankey-chart")
export class SankeyChart extends LitElement {
  @property({ attribute: false }) public data: SankeyChartData = [];

  render() {
    return html`<div>Sankey Chart</div>`;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "sankey-chart": SankeyChart;
  }
}
