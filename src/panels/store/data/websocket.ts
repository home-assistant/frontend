import type { HomeAssistant } from "../../../types";
import type { StoreData, StoreInfo } from "./store";
import type { StoreDispatchEvent } from "./common";
import type { RepositoryBase } from "./repository";

export const fetchStoreInfo = async (hass: HomeAssistant) =>
  hass.connection.sendMessagePromise<StoreInfo>({
    type: "store/info",
  });

export const getRepositories = async (hass: HomeAssistant) =>
  hass.connection.sendMessagePromise<RepositoryBase[]>({
    type: "store/repositories/list",
  });

export const repositoryUninstall = async (
  hass: HomeAssistant,
  repository: string
) =>
  hass.connection.sendMessagePromise<unknown>({
    type: "store/repository/remove",
    repository,
  });

export const repositoryAdd = async (
  hass: HomeAssistant,
  repository: string,
  category: string
) =>
  hass.connection.sendMessagePromise<null | Record<string, string>>({
    type: "store/repositories/add",
    repository: repository,
    category,
  });

export const repositoryUpdate = async (
  hass: HomeAssistant,
  repository: string
) =>
  hass.connection.sendMessagePromise<unknown>({
    type: "store/repository/refresh",
    repository,
  });

export const repositoryDelete = async (
  hass: HomeAssistant,
  repository: string
) =>
  hass.connection.sendMessagePromise<unknown>({
    type: "store/repositories/remove",
    repository,
  });

export const repositoriesClearNew = async (
  hass: HomeAssistant,
  store: StoreData
) =>
  hass.connection.sendMessagePromise<unknown>({
    type: "store/repositories/clear_new",
    categories: store.info.categories,
  });

export const repositoriesClearNewRepository = async (
  hass: HomeAssistant,
  repository: string
) =>
  hass.connection.sendMessagePromise<unknown>({
    type: "store/repositories/clear_new",
    repository,
  });

export const websocketSubscription = (
  hass: HomeAssistant,
  onChange: (result: Record<any, any> | null) => void,
  event: StoreDispatchEvent
) =>
  hass.connection.subscribeMessage(onChange, {
    type: "store/subscribe",
    signal: event,
  });
