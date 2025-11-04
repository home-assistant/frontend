import type { ECOption } from "../../resources/echarts/echarts";
import { ensureArray } from "../../common/array/ensure-array";

export function findClosestDataIndexByTime(
  series: ECOption["series"],
  timeValue: Date
): { seriesIndex: number; dataIndex: number } {
  const seriesArray = ensureArray(series);

  if (!seriesArray || seriesArray.length === 0) {
    return { seriesIndex: 0, dataIndex: 0 };
  }

  let bestSeriesIndex = 0;
  let bestDataIndex = 0;
  let minDiff = Infinity;

  for (const [seriesIndex, serie] of seriesArray.entries()) {
    const data = serie?.data as [Date, number][];
    if (!data || data.length === 0) {
      continue;
    }

    let left = 0;
    let right = data.length - 1;
    let candidateIndex = -1;

    while (left < right) {
      const mid = Math.floor((left + right) / 2);
      const midTime = data[mid][0];

      if (midTime === timeValue) {
        candidateIndex = mid;
        break;
      }
      if (midTime < timeValue) {
        candidateIndex = mid;
        left = mid + 1;
      } else {
        right = mid;
      }
    }

    if (candidateIndex === -1 && left === right) {
      const leftTime = data[left][0];
      if (leftTime <= timeValue) {
        candidateIndex = left;
      }
    }

    if (candidateIndex === -1) {
      continue;
    }

    const candidateTime = data[candidateIndex][0];
    const diff = timeValue.getTime() - candidateTime.getTime();

    if (diff < minDiff) {
      minDiff = diff;
      bestSeriesIndex = seriesIndex;
      bestDataIndex = candidateIndex;
    }
  }

  return { seriesIndex: bestSeriesIndex, dataIndex: bestDataIndex };
}
