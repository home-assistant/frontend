// Import the echarts core module, which provides the necessary interfaces for using echarts.

import type {
  // The series option types are defined with the SeriesOption suffix
  BarSeriesOption,
  LineSeriesOption,
  CustomSeriesOption,
  SankeySeriesOption,
} from "echarts/charts";
// Import the title, tooltip, rectangular coordinate system, dataset and transform components
// Features like Universal Transition and Label Layout
// Import the Canvas renderer
// Note that including the CanvasRenderer or SVGRenderer is a required step
import type {
  // The component option types are defined with the ComponentOption suffix
  TooltipComponentOption,
  DatasetComponentOption,
  LegendComponentOption,
  GridComponentOption,
  DataZoomComponentOption,
  VisualMapComponentOption,
} from "echarts/components";
import type { ComposeOption } from "echarts/core";

// Import charts, all suffixed with Chart
import { BarChart, LineChart, CustomChart } from "echarts/charts";
import {
  TooltipComponent,
  DatasetComponent,
  TransformComponent,
  LegendComponent,
  GridComponent,
  DataZoomComponent,
  VisualMapComponent,
  ToolboxComponent,
} from "echarts/components";
import * as echarts from "echarts/core";
import { LabelLayout, UniversalTransition } from "echarts/features";
import { CanvasRenderer } from "echarts/renderers";

// Create an Option type with only the required components and charts via ComposeOption
export type ECOption = ComposeOption<
  | BarSeriesOption
  | LineSeriesOption
  | CustomSeriesOption
  | TooltipComponentOption
  | DatasetComponentOption
  | LegendComponentOption
  | GridComponentOption
  | DataZoomComponentOption
  | VisualMapComponentOption
  | SankeySeriesOption
>;

// Register the required components
echarts.use([
  BarChart,
  LineChart,
  CustomChart,
  TooltipComponent,
  DatasetComponent,
  LegendComponent,
  GridComponent,
  TransformComponent,
  DataZoomComponent,
  VisualMapComponent,
  LabelLayout,
  UniversalTransition,
  CanvasRenderer,
  ToolboxComponent,
]);

export default echarts;
