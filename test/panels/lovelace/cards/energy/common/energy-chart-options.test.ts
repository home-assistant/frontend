import { assert, describe, it } from "vitest";
import type { LineSeriesOption } from "echarts/charts";

import { fillLineGaps } from "../../../../../../src/panels/lovelace/cards/energy/common/energy-chart-options";

// Helper to get x value from either [x,y] or {value: [x,y]} format
function getX(item: any): number {
  return item?.value?.[0] ?? item?.[0];
}

// Helper to get y value from either [x,y] or {value: [x,y]} format
function getY(item: any): number {
  return item?.value?.[1] ?? item?.[1];
}

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
