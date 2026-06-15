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

  // Phase 1: align every dataset to the shared buckets, inserting zero-valued
  // gap fillers. The original implementation spliced gaps in-place while
  // iterating bucket-by-bucket, which shifts the whole tail of the array on
  // every gap (O(points * gaps) in the worst case). Rebuilding each dataset in
  // a single forward merge against the bucket axis yields the byte-identical
  // aligned array without the per-gap shifting cost.
  const bucketCount = buckets.length;
  for (let i = datasets.length - 1; i >= 0; i--) {
    const data = datasets[i].data;
    if (!data || data.length === 0) {
      continue;
    }
    const dataLength = data.length;
    const aligned: typeof data = [];
    let srcIdx = 0;
    // The original loop runs once per bucket index and reads data[index],
    // which (thanks to the in-place splices) always points at the next
    // unconsumed source element. A defined element with a non-matching x
    // inserts a gap and keeps the element for the next index; a matching or
    // otherwise-defined element is kept and the pointer advances; once the
    // source is exhausted, no further gaps are added.
    for (let index = 0; index < bucketCount; index++) {
      if (srcIdx >= dataLength) {
        break;
      }
      const dataPoint = data[srcIdx];
      const item: any =
        dataPoint && typeof dataPoint === "object" && "value" in dataPoint
          ? dataPoint
          : { value: dataPoint };
      const x = item.value?.[0];
      if (x === undefined) {
        // Malformed element: left untouched in place, pointer advances.
        aligned.push(dataPoint);
        srcIdx++;
      } else if (Number(x) !== buckets[index]) {
        aligned.push({
          value: [buckets[index], 0],
          itemStyle: {
            borderWidth: 0,
          },
        } as (typeof data)[number]);
      } else {
        aligned.push(dataPoint);
        srcIdx++;
      }
    }
    // Trailing source elements past the last consumed bucket index are never
    // reached by the original loop and stay in place unchanged.
    for (; srcIdx < dataLength; srcIdx++) {
      aligned.push(data[srcIdx]);
    }
    datasets[i].data = aligned;
  }

  // Phase 2: per bucket, mark only the uppermost positive and lowermost
  // negative bar of each stack with a rounded cap, and strip the border from
  // zero values. Datasets are now aligned, so data[index] always corresponds
  // to buckets[index] (or is undefined past the dataset's last point).
  for (let index = 0; index < bucketCount; index++) {
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
      if (item.value?.[1] === 0) {
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
  }
}
