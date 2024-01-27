import type {
  BarControllerChartOptions,
  BarControllerDatasetOptions,
} from "chart.js";

export interface TimeLineData {
  start: Date;
  end: Date;
  label?: string | null;
  color?: string;
}

declare module "chart.js" {
  interface ChartTypeRegistry {
    timeline: {
      chartOptions: BarControllerChartOptions;
      datasetOptions: BarControllerDatasetOptions;
      defaultDataPoint: TimeLineData;
      parsedDataType: any;
      scales: "timeline";
    };
  }
}
