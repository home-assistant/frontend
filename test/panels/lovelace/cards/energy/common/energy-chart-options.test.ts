import { assert, describe, it } from "vitest";
import type { BarSeriesOption, LineSeriesOption } from "echarts/charts";

import {
  computeStatMidpoint,
  fillDataGapsAndRoundCaps,
  fillLineGaps,
  generateFillBuckets,
  getCompareTransform,
  getPeriodMidpointOffset,
  getSuggestedMax,
  splitUntrackedConsumption,
} from "../../../../../../src/panels/lovelace/cards/energy/common/energy-chart-options";

// Helper to get x value from either [x,y] or {value: [x,y]} format
function getX(item: any): number {
  return item?.value?.[0] ?? item?.[0];
}

// Helper to get y value from either [x,y] or {value: [x,y]} format
function getY(item: any): number {
  return item?.value?.[1] ?? item?.[1];
}

describe("getSuggestedMax", () => {
  it("returns end date unchanged for 5minute period", () => {
    const end = new Date("2024-03-15T14:37:22.000");
    const result = getSuggestedMax("5minute", end, false);
    assert.equal(result.getTime(), end.getTime());
  });

  it("returns end date unchanged when noRounding is true", () => {
    const end = new Date("2024-03-15T14:37:22.000");
    const result = getSuggestedMax("hour", end, true);
    assert.equal(result.getTime(), end.getTime());
  });

  it("rounds down to middle of hour for hour period", () => {
    const end = new Date("2024-03-15T14:37:22.000");
    const result = getSuggestedMax("hour", end, false);
    assert.equal(result.getMinutes(), 30);
    assert.equal(result.getSeconds(), 0);
    assert.equal(result.getMilliseconds(), 0);
    assert.equal(result.getHours(), 14);
  });

  it("rounds down to start of day for day period", () => {
    const end = new Date("2024-03-15T14:37:22.000");
    const result = getSuggestedMax("day", end, false);
    assert.equal(result.getHours(), 0);
    assert.equal(result.getMinutes(), 0);
    assert.equal(result.getDate(), 15);
  });

  it("rounds down to start of day for week period", () => {
    const end = new Date("2024-03-15T14:37:22.000");
    const result = getSuggestedMax("week", end, false);
    assert.equal(result.getHours(), 0);
    assert.equal(result.getMinutes(), 0);
    assert.equal(result.getDate(), 15);
  });

  it("rounds down to start of month for month period", () => {
    const end = new Date("2024-03-15T14:37:22.000");
    const result = getSuggestedMax("month", end, false);
    assert.equal(result.getDate(), 1);
    assert.equal(result.getHours(), 0);
    assert.equal(result.getMonth(), 2); // March = 2
  });

  it("corrects DST edge case when hour is 0 for day period", () => {
    // Simulate a time that lands exactly on midnight (e.g. DST adjustment)
    const end = new Date("2024-03-15T00:00:00.000");
    const result = getSuggestedMax("day", end, false);
    // Should subtract an hour first, landing on previous day
    assert.equal(result.getDate(), 14);
    assert.equal(result.getHours(), 0);
  });

  it("does not apply DST correction when hour is nonzero", () => {
    const end = new Date("2024-03-15T10:30:00.000");
    const result = getSuggestedMax("day", end, false);
    assert.equal(result.getDate(), 15);
    assert.equal(result.getHours(), 0);
  });

  it("does not mutate the input date", () => {
    const end = new Date("2024-03-15T14:37:22.000");
    const originalTime = end.getTime();
    getSuggestedMax("month", end, false);
    assert.equal(end.getTime(), originalTime);
  });
});

describe("fillLineGaps", () => {
  it("fills gaps in datasets with missing timestamps", () => {
    const datasets: LineSeriesOption[] = [
      {
        type: "line",
        data: [
          [1000, 10],
          [3000, 30],
        ],
      },
      {
        type: "line",
        data: [
          [1000, 100],
          [2000, 200],
          [3000, 300],
        ],
      },
    ];

    const result = fillLineGaps(datasets);

    // First dataset should have gap at 2000 filled with 0
    assert.equal(result[0].data!.length, 3);
    assert.equal(getX(result[0].data![0]), 1000);
    assert.equal(getY(result[0].data![0]), 10);
    assert.equal(getX(result[0].data![1]), 2000);
    assert.equal(getY(result[0].data![1]), 0);
    assert.equal(getX(result[0].data![2]), 3000);
    assert.equal(getY(result[0].data![2]), 30);

    // Second dataset should be unchanged
    assert.equal(result[1].data!.length, 3);
    assert.equal(getX(result[1].data![0]), 1000);
    assert.equal(getY(result[1].data![0]), 100);
    assert.equal(getX(result[1].data![1]), 2000);
    assert.equal(getY(result[1].data![1]), 200);
    assert.equal(getX(result[1].data![2]), 3000);
    assert.equal(getY(result[1].data![2]), 300);
  });

  it("handles unsorted data from multiple sources", () => {
    // This is the bug we're fixing: when multiple power sources are combined,
    // the data may not be in chronological order
    const datasets: LineSeriesOption[] = [
      {
        type: "line",
        data: [
          [3000, 30],
          [1000, 10],
          [2000, 20],
        ],
      },
    ];

    const result = fillLineGaps(datasets);

    // Data should be sorted by timestamp
    assert.equal(result[0].data!.length, 3);
    assert.equal(getX(result[0].data![0]), 1000);
    assert.equal(getY(result[0].data![0]), 10);
    assert.equal(getX(result[0].data![1]), 2000);
    assert.equal(getY(result[0].data![1]), 20);
    assert.equal(getX(result[0].data![2]), 3000);
    assert.equal(getY(result[0].data![2]), 30);
  });

  it("handles multiple datasets with unsorted data", () => {
    const datasets: LineSeriesOption[] = [
      {
        type: "line",
        data: [
          [3000, 30],
          [1000, 10],
        ],
      },
      {
        type: "line",
        data: [
          [2000, 200],
          [1000, 100],
          [3000, 300],
        ],
      },
    ];

    const result = fillLineGaps(datasets);

    // First dataset should be sorted and have gap at 2000 filled
    assert.equal(result[0].data!.length, 3);
    assert.equal(getX(result[0].data![0]), 1000);
    assert.equal(getY(result[0].data![0]), 10);
    assert.equal(getX(result[0].data![1]), 2000);
    assert.equal(getY(result[0].data![1]), 0);
    assert.equal(getX(result[0].data![2]), 3000);
    assert.equal(getY(result[0].data![2]), 30);

    // Second dataset should be sorted
    assert.equal(result[1].data!.length, 3);
    assert.equal(getX(result[1].data![0]), 1000);
    assert.equal(getY(result[1].data![0]), 100);
    assert.equal(getX(result[1].data![1]), 2000);
    assert.equal(getY(result[1].data![1]), 200);
    assert.equal(getX(result[1].data![2]), 3000);
    assert.equal(getY(result[1].data![2]), 300);
  });

  it("handles data with object format (LineDataItemOption)", () => {
    const datasets: LineSeriesOption[] = [
      {
        type: "line",
        data: [{ value: [3000, 30] }, { value: [1000, 10] }],
      },
    ];

    const result = fillLineGaps(datasets);

    assert.equal(result[0].data!.length, 2);
    assert.equal(getX(result[0].data![0]), 1000);
    assert.equal(getY(result[0].data![0]), 10);
    assert.equal(getX(result[0].data![1]), 3000);
    assert.equal(getY(result[0].data![1]), 30);
  });

  it("returns empty array for empty datasets", () => {
    const datasets: LineSeriesOption[] = [
      {
        type: "line",
        data: [],
      },
    ];

    const result = fillLineGaps(datasets);

    assert.deepEqual(result[0].data, []);
  });

  it("handles already sorted data with no gaps", () => {
    const datasets: LineSeriesOption[] = [
      {
        type: "line",
        data: [
          [1000, 10],
          [2000, 20],
          [3000, 30],
        ],
      },
    ];

    const result = fillLineGaps(datasets);

    assert.equal(result[0].data!.length, 3);
    assert.equal(getX(result[0].data![0]), 1000);
    assert.equal(getY(result[0].data![0]), 10);
    assert.equal(getX(result[0].data![1]), 2000);
    assert.equal(getY(result[0].data![1]), 20);
    assert.equal(getX(result[0].data![2]), 3000);
    assert.equal(getY(result[0].data![2]), 30);
  });

  it("preserves original data item properties", () => {
    const datasets: LineSeriesOption[] = [
      {
        type: "line",
        data: [
          { value: [2000, 20], itemStyle: { color: "red" } },
          { value: [1000, 10], itemStyle: { color: "blue" } },
        ],
      },
    ];

    const result = fillLineGaps(datasets);

    // First item should be the one with timestamp 1000
    const firstItem = result[0].data![0] as any;
    assert.equal(getX(firstItem), 1000);
    assert.equal(firstItem.itemStyle.color, "blue");

    // Second item should be the one with timestamp 2000
    const secondItem = result[0].data![1] as any;
    assert.equal(getX(secondItem), 2000);
    assert.equal(secondItem.itemStyle.color, "red");
  });

  it("keeps the last item when a dataset has duplicate timestamps", () => {
    const datasets: LineSeriesOption[] = [
      {
        type: "line",
        data: [
          [1000, 10],
          [1000, 99],
          [2000, 20],
        ],
      },
    ];

    const result = fillLineGaps(datasets);

    // Two distinct buckets; the later [1000, 99] wins for bucket 1000.
    assert.equal(result[0].data!.length, 2);
    assert.equal(getX(result[0].data![0]), 1000);
    assert.equal(getY(result[0].data![0]), 99);
    assert.equal(getX(result[0].data![1]), 2000);
    assert.equal(getY(result[0].data![1]), 20);
  });

  it("produces a NaN bucket filled with zero across datasets", () => {
    // A datapoint with no numeric x coerces to NaN. It adds a NaN bucket but is
    // never stored in any dataset's map, so every dataset gets [NaN, 0] there.
    const datasets: LineSeriesOption[] = [
      {
        type: "line",
        data: [
          [1000, 10],
          [Number.NaN, 50],
        ],
      },
      {
        type: "line",
        data: [[1000, 100]],
      },
    ];

    const result = fillLineGaps(datasets);

    // Buckets present: 1000 and NaN (NaN sorts to the end).
    assert.equal(result[0].data!.length, 2);
    assert.equal(getX(result[0].data![0]), 1000);
    assert.equal(getY(result[0].data![0]), 10);
    assert.isTrue(Number.isNaN(getX(result[0].data![1])));
    assert.equal(getY(result[0].data![1]), 0);

    // Second dataset is aligned to the same buckets, NaN filled with zero.
    assert.equal(result[1].data!.length, 2);
    assert.equal(getX(result[1].data![0]), 1000);
    assert.equal(getY(result[1].data![0]), 100);
    assert.isTrue(Number.isNaN(getX(result[1].data![1])));
    assert.equal(getY(result[1].data![1]), 0);
  });
});

// Helper to get bar data item
function getBarItem(dataset: BarSeriesOption, index: number): any {
  const dp = dataset.data![index];
  return dp && typeof dp === "object" && "value" in dp ? dp : { value: dp };
}

describe("fillDataGapsAndRoundCaps", () => {
  it("fills missing buckets with zero values", () => {
    // When a dataset has entries at some but not all bucket positions,
    // the function splices in zero-value entries to align them
    const datasets: BarSeriesOption[] = [
      {
        type: "bar",
        stack: "a",
        data: [
          [1000, 10],
          [3000, 30],
        ],
      },
      {
        type: "bar",
        stack: "a",
        data: [
          [1000, 100],
          [2000, 200],
          [3000, 300],
        ],
      },
    ];

    fillDataGapsAndRoundCaps(datasets);

    // First dataset should now have 3 entries with bucket 2000 filled in
    assert.equal(datasets[0].data!.length, 3);
    const filled = getBarItem(datasets[0], 1);
    assert.equal(filled.value[0], 2000);
    assert.equal(filled.value[1], 0);
    assert.equal(filled.itemStyle.borderWidth, 0);
  });

  it("sets borderWidth 0 on zero-value existing entries", () => {
    const datasets: BarSeriesOption[] = [
      {
        type: "bar",
        stack: "a",
        data: [
          [1000, 0],
          [2000, 5],
        ],
      },
    ];

    fillDataGapsAndRoundCaps(datasets);

    const zeroItem = getBarItem(datasets[0], 0);
    assert.equal(zeroItem.itemStyle.borderWidth, 0);
  });

  it("rounds caps on top positive bar in stack", () => {
    const datasets: BarSeriesOption[] = [
      {
        type: "bar",
        stack: "a",
        data: [[1000, 10]],
      },
      {
        type: "bar",
        stack: "a",
        data: [[1000, 20]],
      },
    ];

    fillDataGapsAndRoundCaps(datasets);

    // Last dataset (topmost positive) gets rounded top caps
    // Iteration is reverse so first positive hit from the end gets the cap
    const topItem = getBarItem(datasets[1], 0);
    assert.deepEqual(topItem.itemStyle.borderRadius, [4, 4, 0, 0]);

    // Bottom dataset should NOT have rounded caps
    const bottomItem = getBarItem(datasets[0], 0);
    assert.equal(bottomItem.itemStyle?.borderRadius, undefined);
  });

  it("rounds caps on bottom negative bar in stack", () => {
    const datasets: BarSeriesOption[] = [
      {
        type: "bar",
        stack: "a",
        data: [[1000, -10]],
      },
      {
        type: "bar",
        stack: "a",
        data: [[1000, -20]],
      },
    ];

    fillDataGapsAndRoundCaps(datasets);

    // Last dataset (bottommost negative) gets rounded bottom caps
    const bottomItem = getBarItem(datasets[1], 0);
    assert.deepEqual(bottomItem.itemStyle.borderRadius, [0, 0, 4, 4]);

    // First dataset should NOT have rounded caps
    const topItem = getBarItem(datasets[0], 0);
    assert.equal(topItem.itemStyle?.borderRadius, undefined);
  });

  it("handles different stacks independently", () => {
    const datasets: BarSeriesOption[] = [
      {
        type: "bar",
        stack: "a",
        data: [[1000, 10]],
      },
      {
        type: "bar",
        stack: "b",
        data: [[1000, 20]],
      },
    ];

    fillDataGapsAndRoundCaps(datasets);

    // Both should get caps since they're in different stacks
    const itemA = getBarItem(datasets[0], 0);
    assert.deepEqual(itemA.itemStyle.borderRadius, [4, 4, 0, 0]);

    const itemB = getBarItem(datasets[1], 0);
    assert.deepEqual(itemB.itemStyle.borderRadius, [4, 4, 0, 0]);
  });

  it("handles object-format data items", () => {
    const datasets: BarSeriesOption[] = [
      {
        type: "bar",
        stack: "a",
        data: [{ value: [1000, 10] }],
      },
      {
        type: "bar",
        stack: "a",
        data: [{ value: [2000, 20] }],
      },
    ];

    fillDataGapsAndRoundCaps(datasets);

    // Both datasets should now have 2 entries
    assert.equal(datasets[0].data!.length, 2);
    assert.equal(datasets[1].data!.length, 2);
  });

  it("handles empty datasets", () => {
    const datasets: BarSeriesOption[] = [
      {
        type: "bar",
        stack: "a",
        data: [],
      },
    ];

    fillDataGapsAndRoundCaps(datasets);

    assert.equal(datasets[0].data!.length, 0);
  });

  it("does not fill trailing buckets without an explicit grid", () => {
    // Legacy behavior pin: buckets past a dataset's last real point are
    // only appended when extraBuckets is passed.
    const datasets: BarSeriesOption[] = [
      {
        type: "bar",
        stack: "a",
        data: [[1000, 10]],
      },
      {
        type: "bar",
        stack: "a",
        data: [
          [1000, 100],
          [2000, 200],
        ],
      },
    ];

    fillDataGapsAndRoundCaps(datasets);

    assert.equal(datasets[0].data!.length, 1);
    assert.equal(datasets[1].data!.length, 2);
  });

  it("appends trailing zero buckets from the explicit grid", () => {
    // The single-reading case: one real point in the first bucket must
    // be padded with zero buckets across the whole grid, otherwise ECharts
    // derives a degenerate bar band width and expands the time axis.
    const datasets: BarSeriesOption[] = [
      {
        type: "bar",
        stack: "a",
        data: [[1000, 10]],
      },
    ];

    fillDataGapsAndRoundCaps(datasets, true, [1000, 2000, 3000, 4000]);

    assert.equal(datasets[0].data!.length, 4);
    assert.equal(getBarItem(datasets[0], 0).value[1], 10);
    for (const index of [1, 2, 3]) {
      const item = getBarItem(datasets[0], index);
      assert.equal(item.value[0], 1000 * (index + 1));
      assert.equal(item.value[1], 0);
      assert.equal(item.itemStyle.borderWidth, 0);
    }
  });

  it("fills leading and middle buckets from the explicit grid", () => {
    const datasets: BarSeriesOption[] = [
      {
        type: "bar",
        stack: "a",
        data: [[3000, 30]],
      },
    ];

    fillDataGapsAndRoundCaps(datasets, true, [1000, 2000, 3000, 4000]);

    assert.equal(datasets[0].data!.length, 4);
    assert.deepEqual(
      datasets[0].data!.map((item) => getX(item)),
      [1000, 2000, 3000, 4000]
    );
    assert.deepEqual(
      datasets[0].data!.map((item) => getY(item)),
      [0, 0, 30, 0]
    );
  });

  it("keeps originally-empty datasets empty when a grid is passed", () => {
    // Compare placeholder datasets must stay empty so no-data detection
    // keeps working.
    const datasets: BarSeriesOption[] = [
      {
        type: "bar",
        stack: "a",
        data: [],
      },
      {
        type: "bar",
        stack: "a",
        data: [[1000, 10]],
      },
    ];

    fillDataGapsAndRoundCaps(datasets, true, [1000, 2000]);

    assert.equal(datasets[0].data!.length, 0);
    assert.equal(datasets[1].data!.length, 2);
  });

  it("still rounds caps on the real bar when grid buckets are added", () => {
    const datasets: BarSeriesOption[] = [
      {
        type: "bar",
        stack: "a",
        data: [[2000, 10]],
      },
    ];

    fillDataGapsAndRoundCaps(datasets, true, [1000, 2000, 3000]);

    const realItem = getBarItem(datasets[0], 1);
    assert.equal(realItem.value[1], 10);
    assert.deepEqual(realItem.itemStyle.borderRadius, [4, 4, 0, 0]);
    // Zero fills get no border at all
    assert.equal(getBarItem(datasets[0], 0).itemStyle.borderWidth, 0);
    assert.equal(getBarItem(datasets[0], 2).itemStyle.borderWidth, 0);
  });
});

describe("getPeriodMidpointOffset", () => {
  const HOUR = 60 * 60 * 1000;

  it("returns half the nominal period when no gap was measured", () => {
    assert.equal(getPeriodMidpointOffset("hour"), HOUR / 2);
    assert.equal(getPeriodMidpointOffset("5minute"), 2.5 * 60 * 1000);
  });

  it("returns 0 for daily and longer periods", () => {
    assert.equal(getPeriodMidpointOffset("day"), 0);
    assert.equal(getPeriodMidpointOffset("week"), 0);
    assert.equal(getPeriodMidpointOffset("month"), 0);
    // Even with a measured gap
    assert.equal(getPeriodMidpointOffset("day", 24 * HOUR), 0);
  });

  it("uses half the measured gap for finer-grained data", () => {
    // e.g. 5-minute data shown with an hourly period
    assert.equal(
      getPeriodMidpointOffset("hour", 5 * 60 * 1000),
      2.5 * 60 * 1000
    );
  });

  it("clamps the measured gap to the nominal period for sparse data", () => {
    // e.g. two readings 12h apart in an hourly view
    assert.equal(getPeriodMidpointOffset("hour", 12 * HOUR), HOUR / 2);
  });
});

describe("generateFillBuckets", () => {
  const HOUR = 60 * 60 * 1000;
  // Tests run in TZ=Etc/UTC, so local time equals UTC here.
  const start = new Date("2024-03-15T00:00:00.000Z");
  const end = new Date("2024-03-16T00:00:00.000Z");

  const barsAt = (xs: number[], id = "main"): BarSeriesOption => ({
    type: "bar",
    id,
    data: xs.map((x) => [x, 1, x - HOUR / 2]),
  });

  it("expands a single hourly bucket to the full day grid", () => {
    // Real bucket: 09:00-10:00 centered at 09:30
    const anchor = start.getTime() + 9.5 * HOUR;
    const buckets = generateFillBuckets([barsAt([anchor])], start, end, "hour");

    assert.equal(buckets.length, 24);
    const sorted = [...buckets].sort((a, b) => a - b);
    assert.equal(sorted[0], start.getTime() + 0.5 * HOUR);
    assert.equal(sorted[23], start.getTime() + 23.5 * HOUR);
    for (let i = 1; i < sorted.length; i++) {
      assert.equal(sorted[i] - sorted[i - 1], HOUR);
    }
    assert.include(buckets, anchor);
  });

  it("keeps the grid anchored on data not aligned to the range start", () => {
    // Half-hour timezone simulation: recorder buckets sit at :30 local, so
    // midpoints are on the whole hour. The grid must follow the data, not
    // the local-midnight range start.
    const anchor = start.getTime() + 10 * HOUR; // 09:30-10:30 bucket
    const buckets = generateFillBuckets([barsAt([anchor])], start, end, "hour");

    const sorted = [...buckets].sort((a, b) => a - b);
    assert.equal(sorted[0], start.getTime());
    assert.equal(sorted[sorted.length - 1], start.getTime() + 23 * HOUR);
    assert.isTrue(sorted.every((ts) => (ts - anchor) % HOUR === 0));
  });

  it("generates 5minute buckets", () => {
    const fiveMin = 5 * 60 * 1000;
    const anchor = start.getTime() + fiveMin / 2;
    const shortEnd = new Date(start.getTime() + HOUR);
    const buckets = generateFillBuckets(
      [barsAt([anchor])],
      start,
      shortEnd,
      "5minute"
    );

    assert.equal(buckets.length, 12);
    const sorted = [...buckets].sort((a, b) => a - b);
    for (let i = 1; i < sorted.length; i++) {
      assert.equal(sorted[i] - sorted[i - 1], fiveMin);
    }
  });

  it("generates day buckets at period starts", () => {
    const weekEnd = new Date("2024-03-22T00:00:00.000Z");
    const anchor = start.getTime() + 3 * 24 * HOUR; // day 4 of the range
    const buckets = generateFillBuckets(
      [barsAt([anchor])],
      start,
      weekEnd,
      "day"
    );

    assert.equal(buckets.length, 7);
    const sorted = [...buckets].sort((a, b) => a - b);
    assert.equal(sorted[0], start.getTime());
    assert.equal(sorted[6], start.getTime() + 6 * 24 * HOUR);
  });

  it("generates month buckets with variable month lengths", () => {
    const yearStart = new Date("2024-01-01T00:00:00.000Z");
    const yearEnd = new Date("2025-01-01T00:00:00.000Z");
    const anchor = Date.UTC(2024, 4, 1); // May 1st
    const buckets = generateFillBuckets(
      [barsAt([anchor])],
      yearStart,
      yearEnd,
      "month"
    );

    assert.equal(buckets.length, 12);
    const sorted = [...buckets].sort((a, b) => a - b);
    for (let month = 0; month < 12; month++) {
      assert.equal(sorted[month], Date.UTC(2024, month, 1));
    }
  });

  it("ignores compare series and placeholders when picking the anchor", () => {
    const compareAnchor = start.getTime() + 0.25 * HOUR; // off-grid transform
    const mainAnchor = start.getTime() + 9.5 * HOUR;
    const buckets = generateFillBuckets(
      [
        { type: "bar", id: "compare-placeholder", data: [] },
        barsAt([compareAnchor], "compare-sensor.water"),
        barsAt([mainAnchor], "sensor.water"),
      ],
      start,
      end,
      "hour"
    );

    assert.include(buckets, mainAnchor);
    assert.isTrue(
      buckets.every((ts) => (ts - mainAnchor) % HOUR === 0),
      "grid must be anchored on the main series"
    );
  });

  it("skips empty main series and anchors on the next one with data", () => {
    const anchor = start.getTime() + 9.5 * HOUR;
    const buckets = generateFillBuckets(
      [barsAt([], "sensor.empty"), barsAt([anchor], "sensor.water")],
      start,
      end,
      "hour"
    );

    assert.equal(buckets.length, 24);
    assert.include(buckets, anchor);
  });

  it("returns an empty grid when there is no data to anchor on", () => {
    assert.deepEqual(generateFillBuckets([], start, end, "hour"), []);
    assert.deepEqual(
      generateFillBuckets(
        [barsAt([], "sensor.empty"), barsAt([1000], "compare-sensor.water")],
        start,
        end,
        "hour"
      ),
      []
    );
  });

  it("reads the anchor from object-format data items", () => {
    const anchor = start.getTime() + 9.5 * HOUR;
    const buckets = generateFillBuckets(
      [
        {
          type: "bar",
          id: "main",
          data: [{ value: [anchor, 1] }],
        },
      ],
      start,
      end,
      "hour"
    );

    assert.equal(buckets.length, 24);
    assert.include(buckets, anchor);
  });
});

describe("getCompareTransform", () => {
  it("returns identity transform when no compareStart", () => {
    const start = new Date("2024-03-01");
    const transform = getCompareTransform(start);

    const testDate = new Date("2024-03-15T12:00:00");
    assert.equal(transform(testDate).getTime(), testDate.getTime());
  });

  it("returns identity transform when compareStart is undefined", () => {
    const start = new Date("2024-03-01");
    const transform = getCompareTransform(start, undefined);

    const testDate = new Date("2024-03-15T12:00:00");
    assert.equal(transform(testDate).getTime(), testDate.getTime());
  });

  it("shifts by years when start is at year boundary", () => {
    const start = new Date("2024-01-01T00:00:00");
    const compareStart = new Date("2023-01-01T00:00:00");
    const transform = getCompareTransform(start, compareStart);

    const testDate = new Date("2023-06-15T12:00:00");
    const result = transform(testDate);
    // Should shift forward by 1 year
    assert.equal(result.getFullYear(), 2024);
    assert.equal(result.getMonth(), 5); // June
    assert.equal(result.getDate(), 15);
  });

  it("shifts by months when start is at month boundary", () => {
    const start = new Date("2024-03-01T00:00:00");
    const compareStart = new Date("2024-01-01T00:00:00");
    const transform = getCompareTransform(start, compareStart);

    const testDate = new Date("2024-01-15T12:00:00");
    const result = transform(testDate);
    // Should shift forward by 2 months
    assert.equal(result.getMonth(), 2); // March
    assert.equal(result.getDate(), 15);
  });

  it("shifts by days when start is at day boundary", () => {
    const start = new Date("2024-03-15T00:00:00");
    const compareStart = new Date("2024-03-08T00:00:00");
    const transform = getCompareTransform(start, compareStart);

    const testDate = new Date("2024-03-08T14:30:00");
    const result = transform(testDate);
    // Should shift forward by 7 days
    assert.equal(result.getDate(), 15);
    assert.equal(result.getHours(), 14);
    assert.equal(result.getMinutes(), 30);
  });

  it("falls back to millisecond offset for non-aligned starts", () => {
    const start = new Date("2024-03-15T10:30:00");
    const compareStart = new Date("2024-03-14T10:30:00");
    const transform = getCompareTransform(start, compareStart);

    const testDate = new Date("2024-03-14T12:00:00");
    const result = transform(testDate);
    const expectedOffset = start.getTime() - compareStart.getTime();
    assert.equal(result.getTime(), testDate.getTime() + expectedOffset);
  });

  it("prefers year shift over month shift when both apply", () => {
    // Jan 1 is both start-of-year and start-of-month
    const start = new Date("2024-01-01T00:00:00");
    const compareStart = new Date("2022-01-01T00:00:00");
    const transform = getCompareTransform(start, compareStart);

    const testDate = new Date("2022-07-01T00:00:00");
    const result = transform(testDate);
    // Should shift by 2 years (year check comes first)
    assert.equal(result.getFullYear(), 2024);
    assert.equal(result.getMonth(), 6); // July
  });

  it("uses month shift when start is at month but not year boundary", () => {
    const start = new Date("2024-06-01T00:00:00");
    const compareStart = new Date("2024-03-01T00:00:00");
    const transform = getCompareTransform(start, compareStart);

    const testDate = new Date("2024-03-20T08:00:00");
    const result = transform(testDate);
    // Should shift by 3 months
    assert.equal(result.getMonth(), 5); // June
    assert.equal(result.getDate(), 20);
  });

  it("falls back to day shift when month shift would clamp end-of-month days", () => {
    // Comparing Feb 2025 (28d) to Jan 2025 (31d): Jan 29/30/31 don't have a
    // matching day in Feb, so addMonths would clamp them all to Feb 28 and
    // stack them on top of the last main-range bar. Day-shift keeps them
    // unique past the main range.
    const start = new Date("2025-02-01T00:00:00");
    const compareStart = new Date("2025-01-01T00:00:00");
    const transform = getCompareTransform(start, compareStart);

    const jan31 = new Date("2025-01-31T00:00:00");
    const result = transform(jan31);
    // Jan 31 + 31 days = Mar 3 (not clamped to Feb 28)
    assert.equal(result.getMonth(), 2); // March
    assert.equal(result.getDate(), 3);

    // Jan 28 still maps to Feb 28 via the normal month shift
    const jan28 = new Date("2025-01-28T00:00:00");
    const inRange = transform(jan28);
    assert.equal(inRange.getMonth(), 1); // February
    assert.equal(inRange.getDate(), 28);
  });

  it("falls back to day shift when year shift would clamp Feb 29 in a non-leap year", () => {
    // Comparing 2025 (non-leap) to 2024 (leap): Feb 29 2024 has no match in
    // 2025, so addYears would clamp it to Feb 28 2025 and stack it on top of
    // that day's main bar.
    const start = new Date("2025-01-01T00:00:00");
    const compareStart = new Date("2024-01-01T00:00:00");
    const transform = getCompareTransform(start, compareStart);

    const feb29 = new Date("2024-02-29T00:00:00");
    const result = transform(feb29);
    // Feb 29 2024 + 366 days = Mar 1 2025 (not clamped to Feb 28 2025)
    assert.equal(result.getFullYear(), 2025);
    assert.equal(result.getMonth(), 2); // March
    assert.equal(result.getDate(), 1);
  });
});

describe("computeStatMidpoint", () => {
  const start = Date.UTC(2024, 0, 1, 10, 0, 0);
  const end = Date.UTC(2024, 0, 1, 11, 0, 0);

  it("returns midpoint for hour period", () => {
    assert.equal(computeStatMidpoint(start, end, "hour"), (start + end) / 2);
  });

  it("returns midpoint for 5minute period", () => {
    assert.equal(computeStatMidpoint(start, end, "5minute"), (start + end) / 2);
  });

  it("returns start for day and month periods", () => {
    assert.equal(computeStatMidpoint(start, end, "day"), start);
    assert.equal(computeStatMidpoint(start, end, "month"), start);
  });

  it("applies compare transform to start for non-centered periods", () => {
    const transform = (ts: Date) => new Date(ts.getTime() + 1000);
    assert.equal(
      computeStatMidpoint(start, end, "day", transform),
      start + 1000
    );
  });

  it("applies compare transform to both ends for centered periods", () => {
    const transform = (ts: Date) => new Date(ts.getTime() + 1000);
    assert.equal(
      computeStatMidpoint(start, end, "hour", transform),
      (start + end) / 2 + 1000
    );
  });
});

describe("splitUntrackedConsumption", () => {
  it("passes through positive untracked when grid exceeds devices", () => {
    const usedTotal = { 1000: 5, 2000: 3 };
    const deviceTotal = { 1000: 2, 2000: 1 };
    const result = splitUntrackedConsumption(usedTotal, deviceTotal);
    assert.deepEqual(result.positive, { 1000: 3, 2000: 2 });
    assert.deepEqual(result.negative, {});
  });

  it("clamps positive to zero and records negatives separately", () => {
    // Device sensors report more than the integer grid meter
    const usedTotal = { 1000: 0, 2000: 1 };
    const deviceTotal = { 1000: 0.3, 2000: 1.7 };
    const result = splitUntrackedConsumption(usedTotal, deviceTotal);
    assert.equal(result.positive[1000], 0);
    assert.equal(result.positive[2000], 0);
    assert.approximately(result.negative[1000], -0.3, 0.001);
    assert.approximately(result.negative[2000], -0.7, 0.001);
  });

  it("treats grid equal to devices as zero with no negative", () => {
    const usedTotal = { 1000: 2.5 };
    const deviceTotal = { 1000: 2.5 };
    const result = splitUntrackedConsumption(usedTotal, deviceTotal);
    assert.equal(result.positive[1000], 0);
    assert.deepEqual(result.negative, {});
  });

  it("returns full grid value when no device data exists for timestamp", () => {
    const usedTotal = { 1000: 4 };
    const deviceTotal = {};
    const result = splitUntrackedConsumption(usedTotal, deviceTotal);
    assert.equal(result.positive[1000], 4);
    assert.deepEqual(result.negative, {});
  });

  it("ignores device timestamps not present in usedTotal", () => {
    const usedTotal = { 1000: 2 };
    const deviceTotal = { 1000: 1, 9999: 5 };
    const result = splitUntrackedConsumption(usedTotal, deviceTotal);
    assert.deepEqual(result.positive, { 1000: 1 });
    assert.deepEqual(result.negative, {});
  });

  it("handles mixed positive and negative across timestamps", () => {
    const usedTotal = { 1000: 0, 2000: 3, 3000: 1 };
    const deviceTotal = { 1000: 0.5, 2000: 1, 3000: 2 };
    const result = splitUntrackedConsumption(usedTotal, deviceTotal);
    assert.equal(result.positive[1000], 0); // clamped
    assert.equal(result.positive[2000], 2); // genuine untracked
    assert.equal(result.positive[3000], 0); // clamped
    assert.approximately(result.negative[1000], -0.5, 0.001);
    assert.isUndefined(result.negative[2000]); // positive, not recorded
    assert.approximately(result.negative[3000], -1, 0.001);
  });

  it("returns empty result for empty inputs", () => {
    const result = splitUntrackedConsumption({}, {});
    assert.deepEqual(result.positive, {});
    assert.deepEqual(result.negative, {});
  });

  it("does not mutate input objects", () => {
    const usedTotal = { 1000: 5 };
    const deviceTotal = { 1000: 2 };
    const usedCopy = { ...usedTotal };
    const deviceCopy = { ...deviceTotal };
    splitUntrackedConsumption(usedTotal, deviceTotal);
    assert.deepEqual(usedTotal, usedCopy);
    assert.deepEqual(deviceTotal, deviceCopy);
  });
});
