import type {
  CustomSeriesOption,
  CustomSeriesRenderItem,
} from "echarts/types/dist/shared";
import type { HassEntities } from "home-assistant-js-websocket";
import { hex2rgb } from "../../common/color/convert-color";
import { luminosity } from "../../common/color/rgb";
import type { TimelineEntity } from "../../data/history";
import { snapFrameSize } from "./down-sample";
import { computeTimelineColor } from "./timeline-color";

export interface StateHistoryChartTimelineDataParams {
  states: HassEntities;
  data: TimelineEntity[];
  startTime: Date;
  endTime: Date;
  names?: Record<string, string>;
  showNames: boolean;
  computedStyles: CSSStyleDeclaration;
  renderItem: CustomSeriesRenderItem;
  /** Chart width in device pixels; bounds how many rectangles are emitted. */
  chartWidth: number;
}

export interface TimelineSegment {
  state: string;
  locState: string | null;
  start: number;
  end: number;
}

/** Resolves each frame of a run to the state covering most of that frame. */
function collapseRun(
  segments: TimelineSegment[],
  from: number,
  to: number,
  frameMs: number,
  push: (segment: TimelineSegment) => void
) {
  const runEnd = segments[to - 1].end;
  const frameStates = new Map<
    string,
    { duration: number; locState: string | null }
  >();
  let frameStart = segments[from].start;
  let index = from;

  while (frameStart < runEnd) {
    const boundary = (Math.floor(frameStart / frameMs) + 1) * frameMs;
    // a frame size that rounds back onto frameStart would never advance
    const next = boundary > frameStart ? boundary : frameStart + frameMs;
    const frameEnd = next < runEnd ? next : runEnd;

    frameStates.clear();
    let bestState: string | null = null;
    let bestLocState: string | null = null;
    let bestDuration = 0;
    // Segments are narrower than a frame, so each is visited at most twice:
    // index stops at the one spilling into the next frame.
    let cursor = index;
    while (cursor < to && segments[cursor].start < frameEnd) {
      const segment = segments[cursor];
      cursor++;
      const overlapStart =
        segment.start > frameStart ? segment.start : frameStart;
      const overlapEnd = segment.end < frameEnd ? segment.end : frameEnd;
      if (overlapEnd <= overlapStart) {
        continue;
      }
      let entry = frameStates.get(segment.state);
      if (entry) {
        entry.duration += overlapEnd - overlapStart;
      } else {
        entry = {
          duration: overlapEnd - overlapStart,
          locState: segment.locState,
        };
        frameStates.set(segment.state, entry);
      }
      if (entry.duration > bestDuration) {
        bestDuration = entry.duration;
        bestState = segment.state;
        bestLocState = entry.locState;
      }
    }
    while (index < to && segments[index].end <= frameEnd) {
      index++;
    }
    if (bestState !== null) {
      push({
        state: bestState,
        locState: bestLocState,
        start: frameStart,
        end: frameEnd,
      });
    }
    frameStart = frameEnd;
  }
}

/**
 * Bounds the rectangle count by the chart's pixel width. Segments at least one
 * frame wide are kept as they are; narrower ones are resolved per frame, and
 * neighbours resolving to the same state merge into one rectangle.
 */
export function downSampleTimelineSegments(
  segments: TimelineSegment[],
  frameMs: number
): TimelineSegment[] {
  if (!(frameMs > 0)) {
    return segments;
  }
  const result: TimelineSegment[] = [];
  const push = (segment: TimelineSegment) => {
    const last = result[result.length - 1];
    if (last && last.state === segment.state && last.end === segment.start) {
      last.end = segment.end;
      return;
    }
    result.push(segment);
  };

  let index = 0;
  while (index < segments.length) {
    if (segments[index].end - segments[index].start >= frameMs) {
      push({ ...segments[index] });
      index++;
      continue;
    }
    const from = index;
    index++;
    // A gap of its own frame or more stays a gap; a narrower one is invisible
    // and is absorbed, so that a row of gap-separated slivers stays bounded.
    while (
      index < segments.length &&
      segments[index].end - segments[index].start < frameMs &&
      segments[index].start - segments[index - 1].end < frameMs
    ) {
      index++;
    }
    collapseRun(segments, from, index, frameMs, push);
  }
  return result;
}

/**
 * Transforms processed history (`TimelineEntity[]`) into ECharts custom series
 * for `state-history-chart-timeline`. Pure data processing: all environment
 * inputs (theme style, entity states, chart width, the render callback) are injected so
 * the transform is deterministic and benchmarkable.
 */
export function generateStateHistoryChartTimelineData(
  params: StateHistoryChartTimelineDataParams
): CustomSeriesOption[] {
  const { states, computedStyles, startTime, endTime, renderItem } = params;
  const stateHistory = params.data ?? [];
  const startTimeMs = startTime.getTime();
  const endTimeMs = endTime.getTime();
  // Snapped, and placed on absolute time, so a chart following "now" keeps
  // resolving the same frames instead of reshaping on every refresh.
  const rawFrameMs = Math.ceil(
    (endTimeMs - startTimeMs) / Math.floor(params.chartWidth)
  );
  const frameMs =
    Number.isFinite(rawFrameMs) && rawFrameMs > 0
      ? snapFrameSize(rawFrameMs)
      : 0;
  const datasets: CustomSeriesOption[] = [];
  const names = params.names || {};
  // stateHistory is a list of lists of sorted state objects
  stateHistory.forEach((stateInfo) => {
    let prevState: string | null = null;
    let locState: string | null = null;
    let prevLastChanged = startTimeMs;
    const entityDisplay: string = params.showNames
      ? names[stateInfo.entity_id] || stateInfo.name || stateInfo.entity_id
      : "";

    const segments: TimelineSegment[] = [];
    stateInfo.data.forEach((entityState) => {
      let newState: string | null = entityState.state;
      const timeStamp = entityState.last_changed;
      if (!newState) {
        newState = null;
      }
      if (timeStamp > endTimeMs) {
        // Drop datapoints that are after the requested endTime. This could happen if
        // endTime is 'now' and client time is not in sync with server time.
        return;
      }
      if (prevState === null) {
        prevState = newState;
        locState = entityState.state_localize;
        prevLastChanged = timeStamp;
      } else if (newState !== prevState) {
        segments.push({
          state: prevState,
          locState,
          start: prevLastChanged,
          end: timeStamp,
        });
        prevState = newState;
        locState = entityState.state_localize;
        prevLastChanged = timeStamp;
      }
    });

    if (prevState !== null) {
      segments.push({
        state: prevState,
        locState,
        start: prevLastChanged,
        end: endTimeMs,
      });
    }

    const stateObj = states[stateInfo.entity_id];
    const dataRow = downSampleTimelineSegments(segments, frameMs).map(
      (segment) => {
        const color = computeTimelineColor(
          segment.state,
          computedStyles,
          stateObj
        );
        return {
          value: [
            stateInfo.entity_id,
            new Date(segment.start),
            new Date(segment.end),
            segment.locState,
            color,
            luminosity(hex2rgb(color)) > 0.5 ? "#000" : "#fff",
          ],
          itemStyle: {
            color,
          },
        };
      }
    );

    datasets.push({
      id: stateInfo.entity_id,
      data: dataRow,
      name: entityDisplay,
      dimensions: ["id", "start", "end", "name", "color", "textColor"],
      type: "custom",
      encode: {
        x: [1, 2],
        y: 0,
        itemName: 3,
      },
      renderItem,
      progressive: 0,
    });
  });

  return datasets;
}
