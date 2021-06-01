import { Layout1dBaseConfig } from "./Layout1dBase.js";
import { Layout1dGrid } from "./Layout1dGrid.js";
import { Positions } from "./Layout.js";
interface Layout1dSquareGridConfig extends Layout1dBaseConfig {
  spacing?: number;
  idealSize?: number;
}
declare type Layout1dSquareGridSpecifier = Layout1dSquareGridConfig & {
  type: new (config?: Layout1dSquareGridConfig) => Layout1dSquareGrid;
};
declare type Layout1dSquareGridSpecifierFactory = (
  config?: Layout1dSquareGridConfig
) => Layout1dSquareGridSpecifier;
export declare const layout1dSquareGrid: Layout1dSquareGridSpecifierFactory;
export declare class Layout1dSquareGrid extends Layout1dGrid<Layout1dSquareGridConfig> {
  protected _idealSize: number;
  set idealSize(px: number);
  _getItemPosition(idx: number): Positions;
  _updateLayout(): void;
}
export {};
//# sourceMappingURL=Layout1dSquareGrid.d.ts.map
