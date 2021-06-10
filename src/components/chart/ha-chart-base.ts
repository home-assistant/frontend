import {
  Chart,
  ChartData,
  ChartOptions,
  ChartType,
  LineController,
  TimeScale,
  LinearScale,
  PointElement,
  LineElement,
  Filler,
  Legend,
  Title,
  Tooltip,
  CategoryScale,
} from "chart.js";
import "./chart-date-adapter";
import { css, CSSResultGroup, PropertyValues, ReactiveElement } from "lit";
import { customElement, property } from "lit/decorators";
import {
  TimelineController,
  TimeLineScale,
  TextBarElement,
} from "./chart-type-timeline";

Chart.register(
  Tooltip,
  Title,
  Legend,
  Filler,
  TimeScale,
  LinearScale,
  LineController,
  PointElement,
  LineElement,
  TextBarElement,
  TimeLineScale,
  TimelineController,
  CategoryScale
);

@customElement("ha-chart-base")
export default class HaChartBase extends ReactiveElement {
  public chart!: Chart;

  @property()
  public chartType: ChartType = "line";

  @property({ attribute: false })
  public data: ChartData = { datasets: [] };

  @property({ attribute: false })
  public options: ChartOptions = {};

  protected update(changedProps: PropertyValues): void {
    super.update(changedProps);

    if (!this.hasUpdated) {
      const container = document.createElement("div");
      const canvas = document.createElement("canvas");
      container.append(canvas);
      this.shadowRoot?.append(container);
      const ctx: CanvasRenderingContext2D = canvas.getContext("2d")!;
      this.chart = new Chart(ctx, {
        type: this.chartType,
        data: this.data,
        options: this.options,
      });
      return;
    }

    if (changedProps.has("type")) {
      this.chart.config.type = this.chartType;
    }

    if (changedProps.has("data")) {
      this.chart.data = this.data;
    }
    if (changedProps.has("options")) {
      this.chart.options = this.options;
    }
    this.chart.update("none");
  }

  public updateChart = (): void => {
    if (this.chart) {
      this.chart.update();
    }
  };

  static get styles(): CSSResultGroup {
    return css`
      div {
        position: relative;
      }
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-chart-base": HaChartBase;
  }
}
