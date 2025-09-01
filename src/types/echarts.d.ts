declare module "echarts/lib/chart/graph/install" {
  export const install: EChartsExtensionInstaller;
}

declare module "echarts/lib/util/graphic" {
  export * from "echarts/types/src/util/graphic";
}

declare module "echarts/lib/util/states" {
  export * from "echarts/types/src/util/states";
}

declare module "echarts/lib/chart/sankey/sankeyView" {
  // eslint-disable-next-line no-restricted-exports
  export { default } from "echarts/types/src/chart/sankey/SankeyView";
}
