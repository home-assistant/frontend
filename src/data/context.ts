import { createContext } from "@lit-labs/context";
import { HassConfig } from "home-assistant-js-websocket";
import { HomeAssistant } from "../types";
import { EntityRegistryEntry } from "./entity_registry";

export const statesContext = createContext<HomeAssistant["states"]>("states");
export const entitiesContext =
  createContext<HomeAssistant["entities"]>("entities");
export const devicesContext =
  createContext<HomeAssistant["devices"]>("devices");
export const areasContext = createContext<HomeAssistant["areas"]>("areas");
export const localizeContext =
  createContext<HomeAssistant["localize"]>("localize");
export const localeContext = createContext<HomeAssistant["locale"]>("locale");
export const configContext = createContext<HassConfig>("config");
export const themesContext = createContext<HomeAssistant["themes"]>("themes");
export const selectedThemeContext =
  createContext<HomeAssistant["selectedTheme"]>("selectedTheme");
export const userContext = createContext<HomeAssistant["user"]>("user");
export const userDataContext =
  createContext<HomeAssistant["userData"]>("userData");
export const panelsContext = createContext<HomeAssistant["panels"]>("panels");

export const fullEntitiesContext =
  createContext<EntityRegistryEntry[]>("extendedEntities");
