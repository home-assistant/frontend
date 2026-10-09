import { MockBaseEntity } from "./base-entity";
import type { EntityInput } from "./types";
import { MockAlarmControlPanelEntity } from "./alarm-control-panel-entity";
import { MockAutomationEntity } from "./automation-entity";
import { MockClimateEntity } from "./climate-entity";
import { MockCoverEntity } from "./cover-entity";
import { MockFanEntity } from "./fan-entity";
import { MockGroupEntity } from "./group-entity";
import { MockHumidifierEntity } from "./humidifier-entity";
import { MockInputNumberEntity } from "./input-number-entity";
import { MockLawnMowerEntity } from "./lawn-mower-entity";
import { MockInputSelectEntity } from "./input-select-entity";
import { MockInputTextEntity } from "./input-text-entity";
import { MockLightEntity } from "./light-entity";
import { MockLocationEntity } from "./location-entity";
import { MockLockEntity } from "./lock-entity";
import { MockMediaPlayerEntity } from "./media-player-entity";
import { MockToggleEntity } from "./toggle-entity";
import { MockVacuumEntity } from "./vacuum-entity";
import { MockValveEntity } from "./valve-entity";
import { MockWaterHeaterEntity } from "./water-heater-entity";

type EntityConstructor = new (input: EntityInput) => MockBaseEntity;

const TYPES: Record<string, EntityConstructor> = {
  automation: MockAutomationEntity,
  alarm_control_panel: MockAlarmControlPanelEntity,
  climate: MockClimateEntity,
  cover: MockCoverEntity,
  device_tracker: MockLocationEntity,
  fan: MockFanEntity,
  group: MockGroupEntity,
  humidifier: MockHumidifierEntity,
  input_boolean: MockToggleEntity,
  input_number: MockInputNumberEntity,
  input_text: MockInputTextEntity,
  input_select: MockInputSelectEntity,
  lawn_mower: MockLawnMowerEntity,
  light: MockLightEntity,
  lock: MockLockEntity,
  media_player: MockMediaPlayerEntity,
  person: MockLocationEntity,
  switch: MockToggleEntity,
  vacuum: MockVacuumEntity,
  valve: MockValveEntity,
  water_heater: MockWaterHeaterEntity,
  zone: MockLocationEntity,
};

export const getEntity = (input: EntityInput): MockBaseEntity => {
  const [domain] = input.entity_id.split(".", 2);
  return new (TYPES[domain] || MockBaseEntity)(input);
};
