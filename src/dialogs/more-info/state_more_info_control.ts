import type { HassEntity } from "home-assistant-js-websocket";
import { computeStateDomain } from "../../common/entity/compute_state_domain";
import {
  DOMAINS_HIDE_DEFAULT_MORE_INFO,
  DOMAINS_WITH_MORE_INFO,
} from "./const";

const LAZY_LOADED_MORE_INFO_CONTROL = {
  alarm_control_panel: () => import("./controls/more-info-alarm_control_panel"),
  automation: () => import("./controls/more-info-automation"),
  camera: () => import("./controls/more-info-camera"),
  climate: () => import("./controls/more-info-climate"),
  configurator: () => import("./controls/more-info-configurator"),
  counter: () => import("./controls/more-info-counter"),
  cover: () => import("./controls/more-info-cover"),
  date: () => import("./controls/more-info-date"),
  datetime: () => import("./controls/more-info-datetime"),
  fan: () => import("./controls/more-info-fan"),
  group: () => import("./controls/more-info-group"),
  humidifier: () => import("./controls/more-info-humidifier"),
  image: () => import("./controls/more-info-image"),
  input_boolean: () => import("./controls/more-info-input_boolean"),
  input_datetime: () => import("./controls/more-info-input_datetime"),
  lawn_mower: () => import("./controls/more-info-lawn_mower"),
  light: () => import("./controls/more-info-light"),
  lock: () => import("./controls/more-info-lock"),
  media_player: () => import("./controls/more-info-media_player"),
  person: () => import("./controls/more-info-person"),
  remote: () => import("./controls/more-info-remote"),
  script: () => import("./controls/more-info-script"),
  siren: () => import("./controls/more-info-siren"),
  sun: () => import("./controls/more-info-sun"),
  switch: () => import("./controls/more-info-switch"),
  time: () => import("./controls/more-info-time"),
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
