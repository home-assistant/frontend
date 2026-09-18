import type {
  CustomSeriesOption,
  CustomSeriesRenderItem,
} from "echarts/types/dist/shared";
import { hex2rgb } from "../../common/color/convert-color";
import { luminosity } from "../../common/color/rgb";
import type { TimelineEntity } from "../../data/history";
import type { HomeAssistant } from "../../types";
import { computeTimelineColor } from "./timeline-color";

export interface StateHistoryChartTimelineDataParams {
  hass: HomeAssistant;
  data: TimelineEntity[];
  startTime: Date;
  endTime: Date;
  names?: Record<string, string>;
  showNames: boolean;
  computedStyles: CSSStyleDeclaration;
  renderItem: CustomSeriesRenderItem;
}

/**
 * Transforms processed history (`TimelineEntity[]`) into ECharts custom series
 * for `state-history-chart-timeline`. Pure data processing: all environment
 * inputs (theme style, hass, the render callback) are injected so the
 * transform is deterministic and benchmarkable.
 */
export function generateStateHistoryChartTimelineData(
  params: StateHistoryChartTimelineDataParams
): CustomSeriesOption[] {
  const { hass, computedStyles, startTime, endTime, renderItem } = params;
  const stateHistory = params.data ?? [];
  const datasets: CustomSeriesOption[] = [];
  const names = params.names || {};
  // stateHistory is a list of lists of sorted state objects
  stateHistory.forEach((stateInfo) => {
    let newLastChanged: Date;
    let prevState: string | null = null;
    let locState: string | null = null;
    let prevLastChanged = startTime;
    const entityDisplay: string = params.showNames
      ? names[stateInfo.entity_id] || stateInfo.name || stateInfo.entity_id
      : "";

    const dataRow: unknown[] = [];
    stateInfo.data.forEach((entityState) => {
      let newState: string | null = entityState.state;
      const timeStamp = new Date(entityState.last_changed);
      if (!newState) {
        newState = null;
      }
      if (timeStamp > endTime) {
        // Drop datapoints that are after the requested endTime. This could happen if
        // endTime is 'now' and client time is not in sync with server time.
        return;
      }
      if (prevState === null) {
        prevState = newState;
        locState = entityState.state_localize;
        prevLastChanged = new Date(entityState.last_changed);
      } else if (newState !== prevState) {
        newLastChanged = new Date(entityState.last_changed);

        const color = computeTimelineColor(
          prevState,
          computedStyles,
          hass.states[stateInfo.entity_id]
        );
        dataRow.push({
          value: [
            stateInfo.entity_id,
            prevLastChanged,
            newLastChanged,
            locState,
            color,
            luminosity(hex2rgb(color)) > 0.5 ? "#000" : "#fff",
          ],
          itemStyle: {
            color,
          },
        });

        prevState = newState;
        locState = entityState.state_localize;
        prevLastChanged = newLastChanged;
      }
    });

    if (prevState !== null) {
      const color = computeTimelineColor(
        prevState,
        computedStyles,
        hass.states[stateInfo.entity_id]
      );
      dataRow.push({
        value: [
          stateInfo.entity_id,
          prevLastChanged,
          endTime,
          locState,
          color,
          luminosity(hex2rgb(color)) > 0.5 ? "#000" : "#fff",
        ],
        itemStyle: {
          color,
        },
      });
    }
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
