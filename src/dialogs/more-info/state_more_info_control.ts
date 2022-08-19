import type { HassEntity } from "home-assistant-js-websocket";
import {
  DOMAINS_WITH_MORE_INFO,
  DOMAINS_HIDE_DEFAULT_MORE_INFO,
} from "./const";
import { computeStateDomain } from "../../common/entity/compute_state_domain";

const LAZY_LOADED_MORE_INFO_CONTROL = {
  alarm_control_panel: () => import("./controls/more-info-alarm_control_panel"),
  automation: () => import("./controls/more-info-automation"),
  camera: () => import("./controls/more-info-camera"),
  climate: () => import("./controls/more-info-climate"),
  configurator: () => import("./controls/more-info-configurator"),
  counter: () => import("./controls/more-info-counter"),
  cover: () => import("./controls/more-info-cover"),
  fan: () => import("./controls/more-info-fan"),
  group: () => import("./controls/more-info-group"),
  humidifier: () => import("./controls/more-info-humidifier"),
  input_datetime: () => import("./controls/more-info-input_datetime"),
  light: () => import("./controls/more-info-light"),
  lock: () => import("./controls/more-info-lock"),
  media_player: () => import("./controls/more-info-media_player"),
  person: () => import("./controls/more-info-person"),
  remote: () => import("./controls/more-info-remote"),
  script: () => import("./controls/more-info-script"),
  sun: () => import("./controls/more-info-sun"),
  timer: () => import("./controls/more-info-timer"),
  update: () => import("./controls/more-info-update"),
  vacuum: () => import("./controls/more-info-vacuum"),
  water_heater: () => import("./controls/more-info-water_heater"),
  weather: () => import("./controls/more-info-weather"),
};

export const stateMoreInfoType = (stateObj: HassEntity): string => {
  const domain = computeStateDomain(stateObj);

  return domainMoreInfoType(domain);
};

export const domainMoreInfoType = (domain: string): string => {
  if (DOMAINS_WITH_MORE_INFO.includes(domain)) {
    return domain;
  }
  if (DOMAINS_HIDE_DEFAULT_MORE_INFO.includes(domain)) {
    return "hidden";
  }
  return "default";
};

export const importMoreInfoControl = (type: string) => {
  if (!(type in LAZY_LOADED_MORE_INFO_CONTROL)) {
    return;
  }
  LAZY_LOADED_MORE_INFO_CONTROL[type]();
};
