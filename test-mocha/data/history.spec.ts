import { assert } from "chai";

import { calculateStatisticsSumGrowthWithPercentage } from "../../src/data/history";

describe("calculateStatisticsSumGrowthWithPercentage", () => {
  it("Returns null if not enough values", async () => {
    assert.strictEqual(
      calculateStatisticsSumGrowthWithPercentage([], []),
      null
    );
  });

  it("Returns null if not enough sum stat values", async () => {
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
        []
      ),
      null
    );
  });

  it("Returns null if not enough percentage stat values", async () => {
    assert.strictEqual(
      calculateStatisticsSumGrowthWithPercentage(
        [],
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
        ]
      ),
      null
    );
  });

  it("Returns a percentage of the growth", async () => {
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
          [
            {
              statistic_id: "sensor.off_peak_consumption",
              start: "2021-07-28T04:00:00Z",
              last_reset: null,
              max: null,
              mean: null,
              min: null,
              sum: 50,
              state: null,
            },
            {
              statistic_id: "sensor.off_peak_consumption",
              start: "2021-07-28T05:00:00Z",
              last_reset: null,
              max: null,
              mean: null,
              min: null,
              sum: 100,
              state: null,
            },
            {
              statistic_id: "sensor.off_peak_consumption",
              start: "2021-07-28T07:00:00Z",
              last_reset: null,
              max: null,
              mean: null,
              min: null,
              sum: 200,
              state: null,
            },
          ],
        ]
      ),
      200
    );
  });

  it("It ignores sum data that doesnt match start", async () => {
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
        ]
      ),
      100
    );
  });

  it("It ignores percentage data that doesnt match start", async () => {
    assert.strictEqual(
      calculateStatisticsSumGrowthWithPercentage(
        [
          {
            statistic_id: "sensor.carbon_intensity",
            start: "2021-07-28T04:00:00Z",
            last_reset: null,
            max: 25,
            mean: 25,
            min: 25,
            sum: null,
            state: null,
          },
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
        ]
      ),
      100
    );
  });

  it("Returns a percentage of the growth", async () => {
    assert.strictEqual(
      calculateStatisticsSumGrowthWithPercentage(
        [
          {
            statistic_id: "sensor.grid_fossil_fuel_percentage",
            start: "2021-08-03T06:00:00.000Z",
            mean: 10,
            min: 10,
            max: 10,
            last_reset: "1970-01-01T00:00:00+00:00",
            state: 10,
            sum: null,
          },
          {
            statistic_id: "sensor.grid_fossil_fuel_percentage",
            start: "2021-08-03T07:00:00.000Z",
            mean: 20,
            min: 20,
            max: 20,
            last_reset: "1970-01-01T00:00:00+00:00",
            state: 20,
            sum: null,
          },
          {
            statistic_id: "sensor.grid_fossil_fuel_percentage",
            start: "2021-08-03T08:00:00.000Z",
            mean: 30,
            min: 30,
            max: 30,
            last_reset: "1970-01-01T00:00:00+00:00",
            state: 30,
            sum: null,
          },
          {
            statistic_id: "sensor.grid_fossil_fuel_percentage",
            start: "2021-08-03T09:00:00.000Z",
            mean: 40,
            min: 40,
            max: 40,
            last_reset: "1970-01-01T00:00:00+00:00",
            state: 40,
            sum: null,
          },
          {
            statistic_id: "sensor.grid_fossil_fuel_percentage",
            start: "2021-08-03T10:00:00.000Z",
            mean: 50,
            min: 50,
            max: 50,
            last_reset: "1970-01-01T00:00:00+00:00",
            state: 50,
            sum: null,
          },
          {
            statistic_id: "sensor.grid_fossil_fuel_percentage",
            start: "2021-08-03T11:00:00.000Z",
            mean: 60,
            min: 60,
            max: 60,
            last_reset: "1970-01-01T00:00:00+00:00",
            state: 60,
            sum: null,
          },
          {
            statistic_id: "sensor.grid_fossil_fuel_percentage",
            start: "2021-08-03T12:00:00.000Z",
            mean: 70,
            min: 70,
            max: 70,
            last_reset: "1970-01-01T00:00:00+00:00",
            state: 70,
            sum: null,
          },
          {
            statistic_id: "sensor.grid_fossil_fuel_percentage",
            start: "2021-08-03T13:00:00.000Z",
            mean: 80,
            min: 80,
            max: 80,
            last_reset: "1970-01-01T00:00:00+00:00",
            state: 80,
            sum: null,
          },
          {
            statistic_id: "sensor.grid_fossil_fuel_percentage",
            start: "2021-08-03T14:00:00.000Z",
            mean: 90,
            min: 90,
            max: 90,
            last_reset: "1970-01-01T00:00:00+00:00",
            state: 90,
            sum: null,
          },
          {
            statistic_id: "sensor.grid_fossil_fuel_percentage",
            start: "2021-08-03T15:00:00.000Z",
            mean: 100,
            min: 100,
            max: 100,
            last_reset: "1970-01-01T00:00:00+00:00",
            state: 100,
            sum: null,
          },
          {
            statistic_id: "sensor.grid_fossil_fuel_percentage",
            start: "2021-08-03T16:00:00.000Z",
            mean: 110,
            min: 110,
            max: 110,
            last_reset: "1970-01-01T00:00:00+00:00",
            state: 120,
            sum: null,
          },
        ],
        [
          [
            {
              statistic_id: "sensor.energy_consumption_tarif_1",
              start: "2021-08-03T06:00:00.000Z",
              mean: null,
              min: null,
              max: null,
              last_reset: "1970-01-01T00:00:00+00:00",
              state: 10,
              sum: 10,
            },
            {
              statistic_id: "sensor.energy_consumption_tarif_1",
              start: "2021-08-03T07:00:00.000Z",
              mean: null,
              min: null,
              max: null,
              last_reset: "1970-01-01T00:00:00+00:00",
              state: 20,
              sum: 20,
            },
            {
              statistic_id: "sensor.energy_consumption_tarif_1",
              start: "2021-08-03T08:00:00.000Z",
              mean: null,
              min: null,
              max: null,
              last_reset: "1970-01-01T00:00:00+00:00",
              state: 30,
              sum: 30,
            },
            {
              statistic_id: "sensor.energy_consumption_tarif_1",
              start: "2021-08-03T09:00:00.000Z",
              mean: null,
              min: null,
              max: null,
              last_reset: "1970-01-01T00:00:00+00:00",
              state: 40,
              sum: 40,
            },
            {
              statistic_id: "sensor.energy_consumption_tarif_1",
              start: "2021-08-03T10:00:00.000Z",
              mean: null,
              min: null,
              max: null,
              last_reset: "1970-01-01T00:00:00+00:00",
              state: 50,
              sum: 50,
            },
            {
              statistic_id: "sensor.energy_consumption_tarif_1",
              start: "2021-08-03T11:00:00.000Z",
              mean: null,
              min: null,
              max: null,
              last_reset: "1970-01-01T00:00:00+00:00",
              state: 60,
              sum: 60,
            },
            {
              statistic_id: "sensor.energy_consumption_tarif_1",
              start: "2021-08-03T12:00:00.000Z",
              mean: null,
              min: null,
              max: null,
              last_reset: "1970-01-01T00:00:00+00:00",
              state: 70,
              sum: 70,
            },
            {
              statistic_id: "sensor.energy_consumption_tarif_1",
              start: "2021-08-03T13:00:00.000Z",
              mean: null,
              min: null,
              max: null,
              last_reset: "1970-01-01T00:00:00+00:00",
              state: 80,
              sum: 80,
            },
            {
              statistic_id: "sensor.energy_consumption_tarif_1",
              start: "2021-08-03T14:00:00.000Z",
              mean: null,
              min: null,
              max: null,
              last_reset: "1970-01-01T00:00:00+00:00",
              state: 90,
              sum: 90,
            },
            {
              statistic_id: "sensor.energy_consumption_tarif_1",
              start: "2021-08-03T15:00:00.000Z",
              mean: null,
              min: null,
              max: null,
              last_reset: "1970-01-01T00:00:00+00:00",
              state: 100,
              sum: 100,
            },
          ],
          [
            {
              statistic_id: "sensor.energy_consumption_tarif_2",
              start: "2021-08-03T15:00:00.000Z",
              mean: null,
              min: null,
              max: null,
              last_reset: "1970-01-01T00:00:00+00:00",
              state: 10,
              sum: 10,
            },
            {
              statistic_id: "sensor.energy_consumption_tarif_2",
              start: "2021-08-03T16:00:00.000Z",
              mean: null,
              min: null,
              max: null,
              last_reset: "1970-01-01T00:00:00+00:00",
              state: 20,
              sum: 20,
            },
          ],
        ]
      ),
      65
    );
  });
});
