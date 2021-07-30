import { assert } from "chai";

import { calculateStatisticsSumGrowthWithPercentage } from "../../src/data/history";

describe("calculateStatisticsSumGrowthWithPercentage", () => {
  it("Returns null if not enough values", async () => {
    assert.strictEqual(
      calculateStatisticsSumGrowthWithPercentage([], []),
      null
    );
  });

  it("Returns null if not enough values", async () => {
    assert.strictEqual(
      calculateStatisticsSumGrowthWithPercentage(
        [
          {
            statistic_id: "sensor.carbon_intensity",
            start: "2021-07-28T05:00:00Z",
            last_reset: null,
            max: 75,
            mean: 50,
            min: 25,
            sum: null,
            state: null,
          },
          {
            statistic_id: "sensor.carbon_intensity",
            start: "2021-07-28T07:00:00Z",
            last_reset: null,
            max: 100,
            mean: 75,
            min: 50,
            sum: null,
            state: null,
          },
        ],
        [
          [
            {
              statistic_id: "sensor.peak_consumption",
              start: "2021-07-28T04:00:00Z",
              last_reset: null,
              max: null,
              mean: null,
              min: null,
              sum: 50,
              state: null,
            },
            {
              statistic_id: "sensor.peak_consumption",
              start: "2021-07-28T05:00:00Z",
              last_reset: null,
              max: null,
              mean: null,
              min: null,
              sum: 100,
              state: null,
            },
            {
              statistic_id: "sensor.peak_consumption",
              start: "2021-07-28T07:00:00Z",
              last_reset: null,
              max: null,
              mean: null,
              min: null,
              sum: 200,
              state: null,
            },
          ],
          [],
        ]
      ),
      100
    );
  });
});
