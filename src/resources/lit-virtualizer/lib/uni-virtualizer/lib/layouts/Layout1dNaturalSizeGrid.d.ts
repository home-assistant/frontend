import { Layout1dGrid } from "./Layout1dGrid.js";
import { Layout1dBaseConfig } from "./Layout1dBase.js";
import { ItemBox } from "./Layout";
export declare class Layout1dNaturalSizeGrid extends Layout1dGrid<Layout1dBaseConfig> {
  updateItemSizes(sizes: { [key: number]: ItemBox }): void;
  _updateLayout(): void;
}
//# sourceMappingURL=Layout1dNaturalSizeGrid.d.ts.map
