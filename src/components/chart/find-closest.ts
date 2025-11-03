export function findClosestDataIndexByTime(
  series: any[],
  timeValue: number
): { seriesIndex: number; dataIndex: number } {
  if (!series || series.length === 0) {
    return { seriesIndex: 0, dataIndex: 0 };
  }

  let bestSeriesIndex = 0;
  let bestDataIndex = 0;
  let minDiff = Infinity;

  for (const [seriesIndex, serie] of series.entries()) {
    const data = serie?.data;
    if (!data || data.length === 0) {
      continue;
    }

    let left = 0;
    let right = data.length - 1;
    let candidateIndex = -1;

    while (left < right) {
      // Geändert: left < right statt left <= right
      const mid = Math.floor((left + right) / 2);
      const midTime = Array.isArray(data[mid]) ? data[mid][0] : data[mid];

      if (midTime === timeValue) {
        candidateIndex = mid;
        break;
      }
      if (midTime < timeValue) {
        candidateIndex = mid;
        left = mid + 1; // Bereich rechts von mid
      } else {
        right = mid; // Bereich links von mid (inkl. mid)
      }
    }

    // Prüfe auch den letzten verbleibenden Index
    if (candidateIndex === -1 && left === right) {
      const leftTime = Array.isArray(data[left]) ? data[left][0] : data[left];
      if (leftTime <= timeValue) {
        candidateIndex = left;
      }
    }

    if (candidateIndex === -1) {
      continue;
    }

    const candidateTime = Array.isArray(data[candidateIndex])
      ? data[candidateIndex][0]
      : data[candidateIndex];
    const diff = timeValue - candidateTime;

    if (diff < minDiff) {
      minDiff = diff;
      bestSeriesIndex = seriesIndex;
      bestDataIndex = candidateIndex;
    }
  }

  return { seriesIndex: bestSeriesIndex, dataIndex: bestDataIndex };
}
