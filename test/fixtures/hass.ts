/**
 * Deterministic `HomeAssistant` stub covering exactly what the chart data
 * transforms read: states, entities, locale, config, localize, and entity
 * state formatting. Everything is stable across runs.
 */
import type { HassEntities, HassEntity } from "home-assistant-js-websocket";
import type { LocalizeFunc } from "../../src/common/translations/localize";
import {
  DateFormat,
  FirstWeekday,
  NumberFormat,
  TimeFormat,
  TimeZone,
} from "../../src/data/translation";
import type { FrontendLocaleData } from "../../src/data/translation";
import { demoConfig } from "../../src/fake_data/demo_config";
import type { HomeAssistant } from "../../src/types";
import { FIXED_EPOCH_MS } from "./history-states";

export const mockLocale: FrontendLocaleData = {
  language: "en",
  number_format: NumberFormat.comma_decimal,
  time_format: TimeFormat.am_pm,
  date_format: DateFormat.language,
  time_zone: TimeZone.server,
  first_weekday: FirstWeekday.language,
};

/** Localize stub: returns the key plus any args, deterministically. */
export const mockLocalize: LocalizeFunc = (key, args?) =>
  args ? `${key}: ${JSON.stringify(args)}` : (key as string);

export const createMockEntityState = (
  entityId: string,
  state: string,
  attributes: Record<string, any> = {}
): HassEntity => ({
  entity_id: entityId,
  state,
  attributes,
  last_changed: new Date(FIXED_EPOCH_MS).toISOString(),
  last_updated: new Date(FIXED_EPOCH_MS).toISOString(),
  context: { id: "fixture", parent_id: null, user_id: null },
});

export const createMockHass = (states: HassEntities = {}): HomeAssistant =>
  ({
    states,
    entities: {},
    devices: {},
    areas: {},
    floors: {},
    config: demoConfig,
    locale: mockLocale,
    language: "en",
    localize: mockLocalize,
    formatEntityState: (stateObj: HassEntity, state?: string) =>
      state ?? stateObj.state,
    formatEntityAttributeValue: (stateObj: HassEntity, attribute: string) =>
      String(stateObj.attributes[attribute]),
    formatEntityAttributeName: (_stateObj: HassEntity, attribute: string) =>
      attribute,
  }) as unknown as HomeAssistant;
