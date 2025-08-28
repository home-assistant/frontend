import type { EChartsExtensionInstallRegisters, ExtensionAPI, GlobalModel } from "echarts/types/dist/shared";

export default function install(registers: EChartsExtensionInstallRegisters) {
    registers.registerLayout(sankeyLayout);
}

function sankeyLayout(ecModel: GlobalModel, api: ExtensionAPI) {
    console.log(ecModel);
    console.log(api);
    ecModel.eachSeriesByType('sankey', (seriesModel: any) => {
        console.log(seriesModel);
    });
}