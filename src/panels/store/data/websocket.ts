import type { HomeAssistant } from "../../../types";
import type { Hacs, HacsInfo } from "./hacs";
import type { HacsDispatchEvent } from "./common";
import type { RepositoryBase } from "./repository";

export const fetchHacsInfo = async (hass: HomeAssistant) =>
  hass.connection.sendMessagePromise<HacsInfo>({
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

export const repositoriesClearNew = async (hass: HomeAssistant, hacs: Hacs) =>
  hass.connection.sendMessagePromise<unknown>({
    type: "store/repositories/clear_new",
    categories: hacs.info.categories,
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
  event: HacsDispatchEvent
) =>
  hass.connection.subscribeMessage(onChange, {
    type: "store/subscribe",
    signal: event,
  });
