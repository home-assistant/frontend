import { BarController, BarElement } from "chart.js";
import { TimeLineData } from "./const";
import { TextBarProps } from "./textbar-element";

function borderProps(properties) {
  let reverse;
  let start;
  let end;
  let top;
  let bottom;
  if (properties.horizontal) {
    reverse = properties.base > properties.x;
    start = "left";
    end = "right";
  } else {
    reverse = properties.base < properties.y;
    start = "bottom";
    end = "top";
  }
  if (reverse) {
    top = "end";
    bottom = "start";
  } else {
    top = "start";
    bottom = "end";
  }
  return { start, end, reverse, top, bottom };
}

function setBorderSkipped(properties, options, stack, index) {
  let edge = options.borderSkipped;
  const res = {};

  if (!edge) {
    properties.borderSkipped = res;
    return;
  }

  if (edge === true) {
    properties.borderSkipped = {
      top: true,
      right: true,
      bottom: true,
      left: true,
    };
    return;
  }

  const { start, end, reverse, top, bottom } = borderProps(properties);

  if (edge === "middle" && stack) {
    properties.enableBorderRadius = true;
    if ((stack._top || 0) === index) {
      edge = top;
    } else if ((stack._bottom || 0) === index) {
      edge = bottom;
    } else {
      res[parseEdge(bottom, start, end, reverse)] = true;
      edge = top;
    }
  }

  res[parseEdge(edge, start, end, reverse)] = true;
  properties.borderSkipped = res;
}

function parseEdge(edge, a, b, reverse) {
  if (reverse) {
    edge = swap(edge, a, b);
    edge = startEnd(edge, b, a);
  } else {
    edge = startEnd(edge, a, b);
  }
  return edge;
}

function swap(orig, v1, v2) {
  return orig === v1 ? v2 : orig === v2 ? v1 : orig;
}

function startEnd(v, start, end) {
  return v === "start" ? start : v === "end" ? end : v;
}

function setInflateAmount(
  properties,
  { inflateAmount }: { inflateAmount?: string | number },
  ratio
) {
  properties.inflateAmount =
    inflateAmount === "auto" ? (ratio === 1 ? 0.33 : 0) : inflateAmount;
}

function parseValue(entry, item, vScale, i) {
  const startValue = vScale.parse(entry.start, i);
  const endValue = vScale.parse(entry.end, i);
  const min = Math.min(startValue, endValue);
  const max = Math.max(startValue, endValue);
  let barStart = min;
  let barEnd = max;

  if (Math.abs(min) > Math.abs(max)) {
    barStart = max;
    barEnd = min;
  }

  // Store `barEnd` (furthest away from origin) as parsed value,
  // to make stacking straight forward
  item[vScale.axis] = barEnd;

  item._custom = {
    barStart,
    barEnd,
    start: startValue,
    end: endValue,
    min,
    max,
  };

  return item;
}

export class TimelineController extends BarController {
  static id = "timeline";

  static defaults = {
    dataElementType: "textbar",
    dataElementOptions: ["text", "textColor", "textPadding"],
    elements: {
      showText: true,
      textPadding: 4,
      minBarWidth: 1,
    },

    layout: {
      padding: {
        left: 0,
        right: 0,
        top: 0,
        bottom: 0,
      },
    },
  };

  static overrides = {
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false,
      },
    },
  };

  parseObjectData(meta, data, start, count) {
    const iScale = meta.iScale;
    const vScale = meta.vScale;
    const labels = iScale.getLabels();
    const singleScale = iScale === vScale;
    const parsed: any[] = [];
    let i;
    let ilen;
    let item;
    let entry;

    for (i = start, ilen = start + count; i < ilen; ++i) {
      entry = data[i];
      item = {};
      item[iScale.axis] = singleScale || iScale.parse(labels[i], i);
      parsed.push(parseValue(entry, item, vScale, i));
    }
    return parsed;
  }

  getLabelAndValue(index) {
    const meta = this._cachedMeta;
    const { vScale } = meta;
    const data = this.getDataset().data[index] as TimeLineData;

    return {
      label: vScale!.getLabelForValue(this.index) || "",
      value: data.label || "",
    };
  }

  updateElements(
    bars: BarElement[],
    start: number,
    count: number,
    mode: "reset" | "resize" | "none" | "hide" | "show" | "default" | "active"
  ) {
    const vScale = this._cachedMeta.vScale!;
    const iScale = this._cachedMeta.iScale!;
    const dataset = this.getDataset();

    const firstOpts = this.resolveDataElementOptions(start, mode);
    const sharedOptions = this.getSharedOptions(firstOpts);
    const includeOptions = this.includeOptions(mode, sharedOptions!);

    const horizontal = vScale.isHorizontal();

    this.updateSharedOptions(sharedOptions!, mode, firstOpts);

    for (let index = start; index < start + count; index++) {
      const data = dataset.data[index] as TimeLineData;

      const y = vScale.getPixelForValue(this.index);

      const xStart = iScale.getPixelForValue(data.start.getTime());
      const xEnd = iScale.getPixelForValue(data.end.getTime());
      const width = xEnd - xStart;

      const parsed = this.getParsed(index);
      const stack = (parsed._stacks || {})[vScale.axis];

      const height = 10;

      const properties: TextBarProps = {
        horizontal,
        x: xStart + width / 2, // Center of the bar
        y: y - height, // Top of bar
        width,
        height: 0,
        base: y + height, // Bottom of bar,
        // Text
        text: data.label,
      };

      if (includeOptions) {
        properties.options =
          sharedOptions || this.resolveDataElementOptions(index, mode);

        properties.options = {
          ...properties.options,
          backgroundColor: data.color,
        };
      }
      const options = properties.options || bars[index].options;

      setBorderSkipped(properties, options, stack, index);
      setInflateAmount(properties, options, 1);
      this.updateElement(bars[index], index, properties as any, mode);
    }
  }

  removeHoverStyle(_element, _datasetIndex, _index) {
    // this._setStyle(element, index, 'active', false);
  }

  setHoverStyle(_element, _datasetIndex, _index) {
    // this._setStyle(element, index, 'active', true);
  }
}
