declare module "echarts/lib/chart/graph/install" {
  export const install: EChartsExtensionInstaller;
}

declare module "echarts/types/dist/shared" {
  export type GlobalModel = GlobalModel;
}

declare module "echarts/lib/util/graphic" {
  export * from "echarts/types/src/util/graphic";
}

declare module "echarts/lib/util/states" {
  export * from "echarts/types/src/util/states";
}
