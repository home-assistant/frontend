import { Layout1dBase } from "./Layout1dBase.js";
/**
 * TODO @straversi: document and test this Layout.
 */
export declare abstract class Layout1dGrid<
  Config
> extends Layout1dBase<Config> {
  protected _rolumns: number;
  _viewDim2Changed(): void;
  _itemDim2Changed(): void;
  _getActiveItems(): void;
  _getItemPosition(idx: number): {
    top: number;
    left: number;
  };
  _updateScrollSize(): void;
}
//# sourceMappingURL=Layout1dGrid.d.ts.map
