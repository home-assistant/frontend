import { MockBaseEntity } from "./base-entity";
import type { EntityInput } from "./types";
import { MockAlarmControlPanelEntity } from "./alarm-control-panel-entity";
import { MockClimateEntity } from "./climate-entity";
import { MockCoverEntity } from "./cover-entity";
import { MockFanEntity } from "./fan-entity";
import { MockGroupEntity } from "./group-entity";
import { MockHumidifierEntity } from "./humidifier-entity";
import { MockInputNumberEntity } from "./input-number-entity";
import { MockInputSelectEntity } from "./input-select-entity";
import { MockInputTextEntity } from "./input-text-entity";
import { MockLightEntity } from "./light-entity";
import { MockLockEntity } from "./lock-entity";
import { MockMediaPlayerEntity } from "./media-player-entity";
import { MockToggleEntity } from "./toggle-entity";
import { MockWaterHeaterEntity } from "./water-heater-entity";

type EntityConstructor = new (input: EntityInput) => MockBaseEntity;

const TYPES: Record<string, EntityConstructor> = {
  automation: MockToggleEntity,
  alarm_control_panel: MockAlarmControlPanelEntity,
  climate: MockClimateEntity,
  cover: MockCoverEntity,
  fan: MockFanEntity,
  group: MockGroupEntity,
  humidifier: MockHumidifierEntity,
  input_boolean: MockToggleEntity,
  input_number: MockInputNumberEntity,
  input_text: MockInputTextEntity,
  input_select: MockInputSelectEntity,
  light: MockLightEntity,
  lock: MockLockEntity,
  media_player: MockMediaPlayerEntity,
  switch: MockToggleEntity,
  water_heater: MockWaterHeaterEntity,
};

export const getEntity = (input: EntityInput): MockBaseEntity => {
  const [domain] = input.entity_id.split(".", 2);
  return new (TYPES[domain] || MockBaseEntity)(input);
};
