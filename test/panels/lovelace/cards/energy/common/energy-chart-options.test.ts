import { assert, describe, it } from "vitest";
import type { BarSeriesOption, LineSeriesOption } from "echarts/charts";

import {
  fillDataGapsAndRoundCaps,
  fillLineGaps,
  getCompareTransform,
  getSuggestedMax,
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

  it("rounds down to start of hour for hour period", () => {
    const end = new Date("2024-03-15T14:37:22.000");
    const result = getSuggestedMax("hour", end, false);
    assert.equal(result.getMinutes(), 0);
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
});
