import { Layout1dBase } from "./Layout1dBase";
export const layout1dFlex = (config) =>
  Object.assign(
    {
      type: Layout1dFlex,
    },
    config
  );
/**
 * TODO @straversi: document and test this Layout.
 */
export class Layout1dFlex extends Layout1dBase {
  constructor() {
    super(...arguments);
    this._itemSizes = [];
    // private _itemPositions: Array<Positions> = [];
    // private _rolumnStartIdx: Array<number> = [];
    // private _rolumnStartPos: Array<number> = [];
    this._chunkSize = null;
    this._chunks = [];
    this._aspectRatios = {};
    this._numberOfAspectRatiosMeasured = 0;
    this._idealSize = null;
    this._config = {};
    this._defaultConfig = Object.assign({}, super._defaultConfig, {
      spacing: 0,
      idealSize: 200,
    });
    this.listenForChildLoadEvents = true;
    /**
     * TODO graynorton@ Don't hard-code Flickr - probably need a config option
     */
    this.measureChildren = function (e, i) {
      const { naturalWidth, naturalHeight } = e;
      if (naturalWidth !== undefined && naturalHeight != undefined) {
        return { width: naturalWidth, height: naturalHeight };
      }
      const { o_width, o_height } = i;
      if (o_width !== undefined && o_height !== undefined) {
        return { width: o_width, height: o_height };
      }
      return { width: -1, height: -1 };
    };
  }
  set idealSize(px) {
    const _px = Number(px);
    if (_px !== this._idealSize) {
      this._idealSize = _px;
      this._scheduleLayoutUpdate();
    }
  }
  get idealSize() {
    return this._idealSize;
  }
  updateItemSizes(sizes) {
    let dirty;
    Object.keys(sizes).forEach((key) => {
      const n = Number(key);
      const chunk = this._getChunk(n);
      const dims = sizes[n];
      const prevDims = this._itemSizes[n];
      if (dims.width && dims.height) {
        if (
          !prevDims ||
          prevDims.width !== dims.width ||
          prevDims.height !== dims.height
        ) {
          chunk._dirty = true;
          dirty = true;
          this._itemSizes[n] = sizes[n];
          this._recordAspectRatio(sizes[n]);
        }
      }
    });
    if (dirty) {
      this._scheduleLayoutUpdate();
    }
  }
  _newChunk() {
    return {
      ["_rolumns"]: [],
      _itemPositions: [],
      _size: 0,
      _dirty: false,
    };
  }
  _getChunk(idx) {
    return (
      this._chunks[Math.floor(Number(idx) / this._chunkSize)] ||
      this._newChunk()
    );
  }
  _recordAspectRatio(dims) {
    if (dims.width && dims.height) {
      const bucket = Math.round((dims.width / dims.height) * 10) / 10;
      if (this._aspectRatios[bucket]) {
        this._aspectRatios[bucket]++;
      } else {
        this._aspectRatios[bucket] = 1;
      }
      this._numberOfAspectRatiosMeasured++;
    }
  }
  _getRandomAspectRatio() {
    if (this._numberOfAspectRatiosMeasured === 0) {
      return { width: 1, height: 1 };
    }
    const n = Math.random() * this._numberOfAspectRatiosMeasured;
    const buckets = Object.keys(this._aspectRatios);
    let i = -1,
      m = 0;
    while (m < n && i < buckets.length) {
      m += this._aspectRatios[buckets[++i]];
    }
    return { width: Number(buckets[i]), height: 1 };
  }
  _viewDim2Changed() {
    this._scheduleLayoutUpdate();
  }
  _getActiveItems() {
    const chunk = this._getChunk(0);
    if (chunk._rolumns.length === 0) return;
    const scrollPos = Math.max(
      0,
      Math.min(this._scrollPosition, this._scrollSize - this._viewDim1)
    );
    const min = Math.max(0, scrollPos - this._overhang);
    const max = Math.min(
      this._scrollSize,
      scrollPos + this._viewDim1 + this._overhang
    );
    const mid = (min + max) / 2;
    const estMidRolumn = Math.round(
      (mid / this._scrollSize) * chunk._rolumns.length
    );
    let idx = estMidRolumn;
    while (chunk._rolumns[idx]._startPos < min) {
      idx++;
    }
    while (chunk._rolumns[idx]._startPos > min) {
      idx--;
    }
    this._first = chunk._rolumns[idx]._startIdx;
    this._physicalMin = chunk._rolumns[idx]._startPos;
    let rolumnMax;
    while (
      (rolumnMax =
        chunk._rolumns[idx]._startPos +
        chunk._rolumns[idx]._size +
        this._spacing * 2) < max
    ) {
      idx++;
    }
    this._last = chunk._rolumns[idx]._endIdx;
    this._physicalMax = rolumnMax;
  }
  _getItemPosition(idx) {
    const chunk = this._getChunk(0);
    return chunk._itemPositions[idx];
  }
  _getItemSize(idx) {
    const chunk = this._getChunk(0);
    const { width, height } = chunk._itemPositions[idx];
    return { width, height };
  }
  _getNaturalItemDims(idx) {
    let itemDims = this._itemSizes[idx];
    if (
      itemDims === undefined ||
      itemDims.width === -1 ||
      itemDims.height === -1
    ) {
      itemDims = this._getRandomAspectRatio();
    }
    return itemDims;
  }
  _layOutChunk(startIdx) {
    const chunk = this._newChunk();
    let startPos = this._spacing;
    let idx = 0;
    let rolumnSize2 = 0;
    let lastRatio = Infinity;
    const finishRolumn = (lastIdx) => {
      const rolumn = {
        _startIdx: startIdx,
        _endIdx: lastIdx,
        _startPos: startPos - this._spacing,
        _size: 0,
      };
      chunk._rolumns.push(rolumn);
      let itemStartPos = this._spacing;
      for (let i = startIdx; i <= lastIdx; i++) {
        const pos = chunk._itemPositions[i];
        pos.width = pos.width * lastRatio;
        pos.height = pos.height * lastRatio;
        pos.left = this._positionDim === "left" ? startPos : itemStartPos;
        pos.top = this._positionDim === "top" ? startPos : itemStartPos;
        itemStartPos += pos[this._secondarySizeDim] + this._spacing;
      }
      rolumn._size = chunk._itemPositions[lastIdx][this._sizeDim];
    };
    while (idx < this._chunkSize) {
      const itemDims = this._getNaturalItemDims(idx);
      const availableSpace =
        this._viewDim2 - this._spacing * (idx - startIdx + 2);
      const itemSize = itemDims[this._sizeDim];
      const itemSize2 = itemDims[this._secondarySizeDim];
      const idealScaleFactor = this._idealSize / itemSize;
      const adjItemSize = idealScaleFactor * itemSize;
      const adjItemSize2 = idealScaleFactor * itemSize2;
      chunk._itemPositions[idx] = {
        left: 0,
        top: 0,
        width: this._sizeDim === "width" ? adjItemSize : adjItemSize2,
        height: this._sizeDim === "height" ? adjItemSize : adjItemSize2,
      };
      const ratio = availableSpace / (rolumnSize2 + adjItemSize2);
      if (Math.abs(1 - ratio) > Math.abs(1 - lastRatio)) {
        // rolumn is better without adding this item
        finishRolumn(idx - 1);
        startIdx = idx;
        startPos += this._idealSize * lastRatio + this._spacing;
        lastRatio = (this._viewDim2 - 2 * this._spacing) / adjItemSize2;
        rolumnSize2 = adjItemSize2;
      } else {
        // add this item and continue
        rolumnSize2 += adjItemSize2;
        lastRatio = ratio;
      }
      if (idx === this._chunkSize - 1) {
        finishRolumn(idx);
      }
      idx++;
    }
    const lastRolumn = chunk._rolumns[chunk._rolumns.length - 1];
    chunk._size = lastRolumn._startPos + lastRolumn._size;
    return chunk;
  }
  _updateLayout() {
    if (/*this._rolumnStartIdx === undefined ||*/ this._viewDim2 === 0) return;
    this._chunkSize = Math.ceil(
      (2 * (this._viewDim1 * this._viewDim2)) /
        (this._idealSize * this._idealSize)
    );
    console.log("chunkSize", this._chunkSize);
    // TODO: An odd place to do this, need to think through the logistics of getting size info to the layout
    // in all cases
    // this._itemSizes.length = 100;//this._totalItems;
    this._chunks[0] = this._layOutChunk(0);
    // TODO (graynorton): This is a hack to force reflow
    this._spacingChanged = true;
  }
  _updateScrollSize() {
    const chunk = this._chunks[0];
    this._scrollSize =
      !chunk || chunk._rolumns.length === 0
        ? 1
        : chunk._size + 2 * this._spacing;
    // chunk._rolumns[chunk._rolumns.length - 1]._startPos +
    // chunk._itemPositions[chunk._rolumns.length - 1][this._sizeDim] +
    // (this._spacing * 2);
  }
}
//# sourceMappingURL=Layout1dFlex.js.map
