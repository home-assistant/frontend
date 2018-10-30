import {
  HassEntities,
  HassConfig,
  Auth,
  Connection,
  MessageBase,
  HassEntityBase,
  HassEntityAttributeBase,
} from "home-assistant-js-websocket";

export interface Credential {
  auth_provider_type: string;
  auth_provider_id: string;
}

export interface MFAModule {
  id: string;
  name: string;
  enabled: boolean;
}

export interface User {
  id: string;
  is_owner: boolean;
  name: string;
  credentials: Credential[];
  mfa_modules: MFAModule[];
}

export interface Theme {
  // Incomplete
  "primary-color": string;
  "text-primary-color": string;
  "accent-color": string;
}

export interface Panel {
  component_name: string;
  config?: { [key: string]: any };
  icon: string;
  title: string;
  url_path: string;
}

export interface Translation {
  nativeName: string;
  fingerprints: { [fragment: string]: string };
}

export interface HomeAssistant {
  auth: Auth;
  connection: Connection;
  connected: boolean;
  states: HassEntities;
  config: HassConfig;
  themes: {
    default_theme: string;
    themes: { [key: string]: Theme };
  };
  panels: { [key: string]: Panel };
  panelUrl: string;
  language: string;
  resources: { [key: string]: any };
  translationMetadata: {
    fragments: string[];
    translations: {
      [lang: string]: Translation;
    };
  };
  dockedSidebar: boolean;
  moreInfoEntityId: string;
  user: User;
  callService: (
    domain: string,
    service: string,
    serviceData?: { [key: string]: any }
  ) => Promise<void>;
  callApi: <T>(
    method: "GET" | "POST" | "PUT" | "DELETE",
    path: string,
    parameters?: { [key: string]: any }
  ) => Promise<T>;
  fetchWithAuth: (
    path: string,
    init?: { [key: string]: any }
  ) => Promise<Response>;
  sendWS: (msg: MessageBase) => Promise<void>;
  callWS: <T>(msg: MessageBase) => Promise<T>;
}

export type ClimateEntity = HassEntityBase & {
  attributes: HassEntityAttributeBase & {
    current_temperature: number;
    min_temp: number;
    max_temp: number;
    temperature: number;
    target_temp_step?: number;
    target_temp_high?: number;
    target_temp_low?: number;
    target_humidity?: number;
    target_humidity_low?: number;
    target_humidity_high?: number;
    fan_mode?: string;
    fan_list?: string[];
    operation_mode?: string;
    operation_list?: string[];
    hold_mode?: string;
    swing_mode?: string;
    swing_list?: string[];
    away_mode?: "on" | "off";
    aux_heat?: "on" | "off";
  };
};

export type LightEntity = HassEntityBase & {
  attributes: HassEntityAttributeBase & {
    min_mireds: number;
    max_mireds: number;
    friendly_name: string;
    brightness: number;
    hs_color: string[];
  };
};
