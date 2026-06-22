import { AITaskEntityFeature } from "../../data/ai_task";
import { AlarmControlPanelEntityFeature } from "../../data/alarm_control_panel";
import { AssistSatelliteEntityFeature } from "../../data/assist_satellite";
import { CalendarEntityFeature } from "../../data/calendar";
import { CameraEntityFeature } from "../../data/camera";
import { ClimateEntityFeature } from "../../data/climate";
import { ConversationEntityFeature } from "../../data/conversation";
import { CoverEntityFeature } from "../../data/cover";
import { FanEntityFeature } from "../../data/fan";
import { HumidifierEntityFeature } from "../../data/humidifier";
import { LawnMowerEntityFeature } from "../../data/lawn_mower";
import { LightEntityFeature } from "../../data/light";
import { LockEntityFeature } from "../../data/lock";
import { MediaPlayerEntityFeature } from "../../data/media-player";
import { NotifyEntityFeature } from "../../data/notify";
import { RemoteEntityFeature } from "../../data/remote";
import { SirenEntityFeature } from "../../data/siren";
import { TodoListEntityFeature } from "../../data/todo";
import { UpdateEntityFeature } from "../../data/update";
import { VacuumEntityFeature } from "../../data/vacuum";
import { ValveEntityFeature } from "../../data/valve";
import { WaterHeaterEntityFeature } from "../../data/water_heater";
import { WeatherEntityFeature } from "../../data/weather";

export type FeatureEnum = Record<string | number, string | number>;

const DOMAIN_ENUMS = {
  ai_task: AITaskEntityFeature,
  alarm_control_panel: AlarmControlPanelEntityFeature,
  assist_satellite: AssistSatelliteEntityFeature,
  calendar: CalendarEntityFeature,
  camera: CameraEntityFeature,
  climate: ClimateEntityFeature,
  conversation: ConversationEntityFeature,
  cover: CoverEntityFeature,
  fan: FanEntityFeature,
  humidifier: HumidifierEntityFeature,
  lawn_mower: LawnMowerEntityFeature,
  light: LightEntityFeature,
  lock: LockEntityFeature,
  media_player: MediaPlayerEntityFeature,
  notify: NotifyEntityFeature,
  remote: RemoteEntityFeature,
  siren: SirenEntityFeature,
  todo: TodoListEntityFeature,
  update: UpdateEntityFeature,
  vacuum: VacuumEntityFeature,
  valve: ValveEntityFeature,
  water_heater: WaterHeaterEntityFeature,
  weather: WeatherEntityFeature,
};

export function getFeatures(domain: string): FeatureEnum | undefined {
  const enumObj = DOMAIN_ENUMS[domain] as FeatureEnum;
  return enumObj;
}
