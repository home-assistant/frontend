declare module "echarts/lib/chart/graph/install" {
  export const install: EChartsExtensionInstaller;
}

declare module "echarts/lib/util/graphic" {
  export * from "echarts/types/src/util/graphic";
}

declare module "echarts/lib/util/states" {
  export * from "echarts/types/src/util/states";
}

declare module "echarts/lib/chart/sankey/SankeyView" {
  export { default } from "echarts/types/src/chart/sankey/SankeyView";
}

declare module "echarts/lib/util/number" {
  export * from "echarts/types/src/util/number";
}

declare module "echarts/lib/scale/helper" {
  export * from "echarts/types/src/scale/helper";
}
