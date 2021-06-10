/* eslint-disable max-classes-per-file */
import {
  BarController,
  BarElement,
  BarOptions,
  BarProps,
  TimeScale,
} from "chart.js";

import { hex2rgb } from "../../common/color/convert-color";
import { luminosity } from "../../common/color/rgb";

export interface TimeLineData {
  start: Date;
  end: Date;
  label: string | null;
  color?: string;
}

export interface TextBarProps extends BarProps {
  text?: string | null;
  options?: Partial<TextBaroptions>;
}

export interface TextBaroptions extends BarOptions {
  textPad?: number;
  textColor?: string;
  backgroundColor: string;
}

export class TimeLineScale extends TimeScale {
  constructor(props) {
    super(props);
    (this.chart.canvas.parentNode as HTMLElement).style.height =
      this.chart.data.datasets.length * 30 + 30 + "px";
  }

  determineDataLimits() {
    const options = this.options;
    // @ts-ignore
    const adapter = this._adapter;
    const unit = options.time.unit || "day";
    let { min, max } = this.getUserBounds();

    const chart = this.chart;

    // Convert data to timestamps
    chart.data.datasets.forEach((dataset, index) => {
      if (!chart.isDatasetVisible(index)) {
        return;
      }
      for (const data of dataset.data as TimeLineData[]) {
        let timestamp0 = adapter.parse(data.start, this);
        let timestamp1 = adapter.parse(data.end, this);
        if (timestamp0 > timestamp1) {
          [timestamp0, timestamp1] = [timestamp1, timestamp0];
        }
        if (min > timestamp0 && timestamp0) {
          min = timestamp0;
        }
        if (max < timestamp1 && timestamp1) {
          max = timestamp1;
        }
      }
    });

    // In case there is no valid min/max, var's use today limits
    min =
      isFinite(min) && !isNaN(min) ? min : +adapter.startOf(Date.now(), unit);
    max = isFinite(max) && !isNaN(max) ? max : +adapter.endOf(Date.now(), unit);

    // Make sure that max is strictly higher than min (required by the lookup table)
    this.min = Math.min(min, max - 1);
    this.max = Math.max(min + 1, max);
  }
}

TimeLineScale.id = "timeline";

/**
 * @type {any}
 */
TimeLineScale.defaults = {
  position: "bottom",
  tooltips: {
    mode: "nearest",
  },
  ticks: {
    autoSkip: true,
  },
};

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
    mode: "reset" | "resize" | "none" | "hide" | "show" | "normal" | "active"
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

      // @ts-ignore
      const y = vScale.getPixelForValue(this.index);

      // @ts-ignore
      const xStart = iScale.getPixelForValue(data.start.getTime());
      // @ts-ignore
      const xEnd = iScale.getPixelForValue(data.end.getTime());
      const width = xEnd - xStart;

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

TimelineController.id = "timeline";

TimelineController.defaults = {
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

  legend: {
    display: false,
  },

  scales: {
    x: {
      type: "timeline",
      position: "bottom",
      distribution: "linear",
      categoryPercentage: 0.8,
      barPercentage: 0.9,

      gridLines: {
        display: true,
        // offsetGridLines: true,
        drawBorder: true,
        drawTicks: true,
      },
      ticks: {
        maxRotation: 0,
      },
      unit: "day",
    },
    y: {
      type: "category",
      position: "left",
      barThickness: 20,
      categoryPercentage: 0.8,
      barPercentage: 0.9,
      offset: true,
      gridLines: {
        display: true,
        offsetGridLines: true,
        drawBorder: true,
        drawTicks: true,
      },
    },
  },
  tooltips: {
    callbacks: {},
  },
};

export class TextBarElement extends BarElement {
  draw(ctx) {
    super.draw(ctx);
    const options = this.options as TextBaroptions;
    const { x, y, base, width, text } = (this as BarElement<
      TextBarProps,
      TextBaroptions
    >).getProps(["x", "y", "base", "width", "text"]);

    if (!text) {
      return;
    }

    ctx.beginPath();
    const textRect = ctx.measureText(text);
    if (
      textRect.width === 0 ||
      textRect.width + (options.textPad || 4) + 2 > width
    ) {
      return;
    }
    const textColor =
      options.textColor ||
      (options.backgroundColor &&
        (luminosity(hex2rgb(options.backgroundColor)) > 0.5 ? "#000" : "#fff"));

    // ctx.font = "12px arial";
    ctx.fillStyle = textColor;
    ctx.lineWidth = 0;
    ctx.strokeStyle = textColor;
    ctx.textBaseline = "middle";
    ctx.fillText(
      text,
      x - width / 2 + (options.textPad || 4),
      y + (base - y) / 2
    );
  }

  tooltipPosition(useFinalPosition: boolean) {
    const { x, y, base } = this.getProps(["x", "y", "base"], useFinalPosition);
    return { x, y: y + (base - y) / 2 };
  }
}

TextBarElement.id = "textbar";

declare module "chart.js" {
  interface ChartTypeRegistry {
    timeline: {
      chartOptions: BarControllerChartOptions;
      datasetOptions: BarControllerDatasetOptions;
      defaultDataPoint: TimeLineData;
      parsedDataType: any;
      scales: "timeline";
    };
  }
}
