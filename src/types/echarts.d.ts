declare module "echarts/lib/chart/graph/install" {
  export const install: EChartsExtensionInstaller;
}

declare module "echarts/types/dist/shared" {
  export type EChartsExtensionInstallRegisters = EChartsExtensionInstallRegisters;
  export type GlobalModel = GlobalModel;
  export type ExtensionAPI = ExtensionAPI;
  export type CallbackDataParams = CallbackDataParams;
}