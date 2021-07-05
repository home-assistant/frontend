import { Layout1dBase, Layout1dBaseConfig } from "./Layout1dBase";
import { ItemBox, Positions, Size } from "./Layout";
interface Layout1dFlexConfig extends Layout1dBaseConfig {
  spacing?: number;
  idealSize?: number;
}
declare type Layout1dFlexSpecifier = Layout1dFlexConfig & {
  type: new (config?: Layout1dFlexConfig) => Layout1dFlex;
};
declare type Layout1dFlexSpecifierFactory = (
  config?: Layout1dFlexConfig
) => Layout1dFlexSpecifier;
export declare const layout1dFlex: Layout1dFlexSpecifierFactory;
interface Rolumn {
  _startIdx: number;
  _endIdx: number;
  _startPos: number;
  _size: number;
}
interface Chunk {
  _itemPositions: Array<Positions>;
  _rolumns: Array<Rolumn>;
  _size: number;
  _dirty: boolean;
}
/**
 * TODO @straversi: document and test this Layout.
 */
export declare class Layout1dFlex extends Layout1dBase<Layout1dFlexConfig> {
  private _itemSizes;
  private _chunkSize;
  private _chunks;
  private _aspectRatios;
  private _numberOfAspectRatiosMeasured;
  protected _idealSize: number | null;
  protected _config: Layout1dFlexConfig;
  protected _defaultConfig: Layout1dFlexConfig;
  listenForChildLoadEvents: boolean;
  /**
   * TODO graynorton@ Don't hard-code Flickr - probably need a config option
   */
  measureChildren: (e: Element, i: unknown) => ItemBox;
  set idealSize(px: number | null);
  get idealSize(): number | null;
  updateItemSizes(sizes: { [key: number]: ItemBox }): void;
  _newChunk(): {
    _rolumns: never[];
    _itemPositions: never[];
    _size: number;
    _dirty: boolean;
  };
  _getChunk(idx: number | string): Chunk;
  _recordAspectRatio(dims: ItemBox): void;
  _getRandomAspectRatio(): Size;
  _viewDim2Changed(): void;
  _getActiveItems(): void;
  _getItemPosition(idx: number): Positions;
  _getItemSize(idx: number): Size;
  _getNaturalItemDims(idx: number): Size;
  _layOutChunk(startIdx: number): Chunk;
  _updateLayout(): void;
  _updateScrollSize(): void;
}
export {};
//# sourceMappingURL=Layout1dFlex.d.ts.map
