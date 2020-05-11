import {
  Auth,
  Connection,
  HassConfig,
  HassEntities,
  HassEntityAttributeBase,
  HassEntityBase,
  HassServices,
  MessageBase,
} from "home-assistant-js-websocket";
import { LocalizeFunc } from "./common/translations/localize";
import { CoreFrontendUserData } from "./data/frontend";
import { getHassTranslations } from "./data/translation";
import { ExternalMessaging } from "./external_app/external_messaging";

declare global {
  /* eslint-disable no-var, no-redeclare */
  var __DEV__: boolean;
  var __DEMO__: boolean;
  var __BUILD__: "latest" | "es5";
  var __VERSION__: string;
  var __STATIC_PATH__: string;
  var __BACKWARDS_COMPAT__: boolean;
  /* eslint-enable no-var, no-redeclare */

  interface Window {
    // Custom panel entry point url
    customPanelJS: string;
    ShadyCSS: {
      nativeCss: boolean;
      nativeShadow: boolean;
      prepareTemplate(templateElement, elementName, elementExtension);
      styleElement(element);
      styleSubtree(element, overrideProperties);
      styleDocument(overrideProperties);
      getComputedStyleValue(element, propertyName);
    };
  }
  // for fire event
  interface HASSDomEvents {
    "value-changed": {
      value: unknown;
    };
    change: undefined;
  }
}

export type Constructor<T = {}> = new (...args: any[]) => T;

export interface WebhookError {
  code: number;
  message: string;
}

export interface Credential {
  auth_provider_type: string;
  auth_provider_id: string;
}

export interface MFAModule {
  id: string;
  name: string;
  enabled: boolean;
}

export interface CurrentUser {
  id: string;
  is_owner: boolean;
  is_admin: boolean;
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

export interface Themes {
  default_theme: string;
  themes: { [key: string]: Theme };
}

export interface PanelInfo<T = {} | null> {
  component_name: string;
  config: T;
  icon: string | null;
  title: string | null;
  url_path: string;
}

export interface Panels {
  [name: string]: PanelInfo;
}

export interface Calendar {
  entity_id: string;
  name: string;
  backgroundColor: string;
}

export interface SelectedCalendar {
  selected: boolean;
  calendar: Calendar;
}

export interface CalendarEvent {
  summary: string;
  title: string;
  start: string;
  end?: string;
  backgroundColor?: string;
  borderColor?: string;
  calendar: string;
  [key: string]: any;
}

export interface CalendarViewChanged {
  end: Date;
  start: Date;
  view: string;
}

export interface ToggleButton {
  label?: string;
  icon: string;
  value: string;
}

export interface Translation {
  nativeName: string;
  isRTL: boolean;
  hash: string;
}

export interface TranslationMetadata {
  fragments: string[];
  translations: {
    [lang: string]: Translation;
  };
}

export interface IconMetaFile {
  version: string;
  parts: IconMeta[];
}

export interface IconMeta {
  start: string;
  file: string;
}

export interface Notification {
  notification_id: string;
  message: string;
  title: string;
  status: "read" | "unread";
  created_at: string;
}

export interface Resources {
  [language: string]: { [key: string]: string };
}

export interface Context {
  id: string;
  parrent_id?: string;
  user_id?: string;
}

export interface ServiceCallResponse {
  context: Context;
}

export interface HomeAssistant {
  auth: Auth & { external?: ExternalMessaging };
  connection: Connection;
  connected: boolean;
  states: HassEntities;
  services: HassServices;
  config: HassConfig;
  themes: Themes;
  selectedTheme?: string | null;
  panels: Panels;
  panelUrl: string;

  // i18n
  // current effective language, in that order:
  //   - backend saved user selected lanugage
  //   - language in local appstorage
  //   - browser language
  //   - english (en)
  language: string;
  // local stored language, keep that name for backward compability
  selectedLanguage: string | null;
  resources: Resources;
  localize: LocalizeFunc;
  translationMetadata: TranslationMetadata;

  vibrate: boolean;
  dockedSidebar: "docked" | "always_hidden" | "auto";
  defaultPanel: string;
  moreInfoEntityId: string | null;
  user?: CurrentUser;
  userData?: CoreFrontendUserData | null;
  hassUrl(path?): string;
  callService(
    domain: string,
    service: string,
    serviceData?: { [key: string]: any }
  ): Promise<ServiceCallResponse>;
  callApi<T>(
    method: "GET" | "POST" | "PUT" | "DELETE",
    path: string,
    parameters?: { [key: string]: any }
  ): Promise<T>;
  fetchWithAuth(path: string, init?: { [key: string]: any }): Promise<Response>;
  sendWS(msg: MessageBase): void;
  callWS<T>(msg: MessageBase): Promise<T>;
  loadBackendTranslation(
    category: Parameters<typeof getHassTranslations>[2],
    integration?: Parameters<typeof getHassTranslations>[3],
    configFlow?: Parameters<typeof getHassTranslations>[4]
  ): Promise<LocalizeFunc>;
}

export type LightEntity = HassEntityBase & {
  attributes: HassEntityAttributeBase & {
    min_mireds: number;
    max_mireds: number;
    friendly_name: string;
    brightness: number;
    hs_color: number[];
  };
};

export type GroupEntity = HassEntityBase & {
  attributes: HassEntityAttributeBase & {
    entity_id: string[];
    order: number;
    auto?: boolean;
    view?: boolean;
    control?: "hidden";
  };
};

export type CameraEntity = HassEntityBase & {
  attributes: HassEntityAttributeBase & {
    model_name: string;
    access_token: string;
    brand: string;
    motion_detection: boolean;
  };
};

export type MediaEntity = HassEntityBase & {
  attributes: HassEntityAttributeBase & {
    media_duration: number;
    media_position: number;
    media_title: string;
    icon?: string;
    entity_picture_local?: string;
  };
  state:
    | "playing"
    | "paused"
    | "idle"
    | "off"
    | "on"
    | "unavailable"
    | "unknown";
};

export type InputSelectEntity = HassEntityBase & {
  attributes: HassEntityAttributeBase & {
    options: string[];
  };
};

export interface Route {
  prefix: string;
  path: string;
}

export interface PanelElement extends HTMLElement {
  hass?: HomeAssistant;
  narrow?: boolean;
  route?: Route | null;
  panel?: PanelInfo;
}

export interface LocalizeMixin {
  hass?: HomeAssistant;
  localize: LocalizeFunc;
}

interface ForecastAttribute {
  temperature: number;
  datetime: string;
  templow?: number;
  precipitation?: number;
  humidity?: number;
  condition?: string;
}

export type WeatherEntity = HassEntityBase & {
  attributes: HassEntityAttributeBase & {
    temperature: number;
    humidity?: number;
    forecast?: ForecastAttribute[];
  };
};
