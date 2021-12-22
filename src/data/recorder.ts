import { HomeAssistant } from "../types";

export interface RecorderConfig {
  auto_purge: boolean;
  commit_interval: number;
  db_max_retries: number;
  db_retry_wait: number;
  db_url: string;
  exclude: RecorderFilter;
  include: RecorderFilter;
  purge_keep_days: number;
}

export interface RecorderFilter {
  domains: string[];
  entities: string[];
  entity_globs: string[];
}

export const fetchRecorderConfig = (hass: HomeAssistant) =>
  hass.callWS<RecorderConfig>({
    type: "recorder/config",
  });

export const updateRecorderConfig = (
  hass: HomeAssistant,
  config: Partial<RecorderConfig>
) =>
  hass.callWS<RecorderConfig>({
    type: "recorder/update_config",
    config,
  });
