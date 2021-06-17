import { TimeScale } from "chart.js";
import { TimeLineData } from "./const";

export class TimeLineScale extends TimeScale {
  static id = "timeline";

  static defaults = {
    position: "bottom",
    tooltips: {
      mode: "nearest",
    },
    ticks: {
      autoSkip: true,
    },
  };

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
