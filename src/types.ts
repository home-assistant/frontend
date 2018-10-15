import { HassEntities, HassConfig } from "home-assistant-js-websocket";

export interface HomeAssistant {
  states: HassEntities;
  config: HassConfig;
  language: string;
  resources: { [key: string]: any };
  callService: (
    domain: string,
    service: string,
    serviceData: { [key: string]: any }
  ) => Promise<void>;
}
