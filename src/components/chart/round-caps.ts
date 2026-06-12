import type { BarSeriesOption } from "echarts/types/dist/shared";

export function fillDataGapsAndRoundCaps(
  datasets: BarSeriesOption[],
  stacked = true
) {
  if (!stacked) {
    // For non-stacked charts, we can simply apply an overall border to each stack
    // to curve the top of the bar, and then override on any negative bars.
    datasets.forEach((dataset) => {
      // Add upper border radius to stack
      dataset.itemStyle = {
        ...dataset.itemStyle,
        borderRadius: [4, 4, 0, 0],
      };
      // And override any negative points to have bottom border curved
      for (let pointIdx = 0; pointIdx < dataset.data!.length; pointIdx++) {
        const dataPoint = dataset.data![pointIdx];
        const item: any =
          dataPoint && typeof dataPoint === "object" && "value" in dataPoint
            ? dataPoint
            : { value: dataPoint };
        if (item.value?.[1] < 0) {
          dataset.data![pointIdx] = {
            ...item,
            itemStyle: {
              ...item.itemStyle,
              borderRadius: [0, 0, 4, 4],
            },
          };
        }
      }
    });
    return;
  }

  // For stacked charts, we need to carefully work through the data points in each
  // stack to ensure only the lowermost negative and uppermost positive values have
  // a curved border.
  const buckets = Array.from(
    new Set(
      datasets
        .map((dataset) =>
          dataset.data!.map((datapoint) => Number(datapoint![0]))
        )
        .flat()
    )
  ).sort((a, b) => a - b);

  // make sure all datasets have the same buckets
  // otherwise the chart will render incorrectly in some cases
  buckets.forEach((bucket, index) => {
    const capRounded = {};
    const capRoundedNegative = {};
    for (let i = datasets.length - 1; i >= 0; i--) {
      const dataPoint = datasets[i].data![index];
      const item: any =
        dataPoint && typeof dataPoint === "object" && "value" in dataPoint
          ? dataPoint
          : { value: dataPoint };
      const x = item.value?.[0];
      const stack = datasets[i].stack ?? "";
      if (x === undefined) {
        continue;
      }
      if (Number(x) !== bucket) {
        datasets[i].data?.splice(index, 0, {
          value: [bucket, 0],
          itemStyle: {
            borderWidth: 0,
          },
        });
      } else if (item.value?.[1] === 0) {
        // remove the border for zero values or it will be rendered
        datasets[i].data![index] = {
          ...item,
          itemStyle: {
            ...item.itemStyle,
            borderWidth: 0,
          },
        };
      } else if (!capRounded[stack] && item.value?.[1] > 0) {
        datasets[i].data![index] = {
          ...item,
          itemStyle: {
            ...item.itemStyle,
            borderRadius: [4, 4, 0, 0],
          },
        };
        capRounded[stack] = true;
      } else if (!capRoundedNegative[stack] && item.value?.[1] < 0) {
        datasets[i].data![index] = {
          ...item,
          itemStyle: {
            ...item.itemStyle,
            borderRadius: [0, 0, 4, 4],
          },
        };
        capRoundedNegative[stack] = true;
      }
    }
  });
}
