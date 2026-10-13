import { shareInFlightRequest } from "../common/util/share-in-flight-request";
import type { HomeAssistant } from "../types";
import type { StatisticsMetaData } from "./recorder";

type StatisticIdsType = "mean" | "sum";

type StatisticIdsApi = Pick<HomeAssistant, "callWS">;

export const getStatisticIds = (
  hass: StatisticIdsApi,
  statistic_type?: StatisticIdsType
) =>
  shareInFlightRequest(
    hass.callWS,
    `recorder/list_statistic_ids:${statistic_type ?? "all"}`,
    () =>
      hass.callWS<StatisticsMetaData[]>({
        type: "recorder/list_statistic_ids",
        statistic_type,
      })
  );
