import { SankeyChart } from "echarts/charts";
import type { EChartsExtensionInstallRegisters } from "echarts/types/src/extension";
import sankeyLayout from "./sankey-layout";
import SankeyView from "./sankey-view";

export default function install(registers: EChartsExtensionInstallRegisters) {
  SankeyChart(registers as any);
  registers.registerLayout(sankeyLayout);
  registers.registerChartView(SankeyView as any);
}
