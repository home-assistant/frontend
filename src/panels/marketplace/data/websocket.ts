import type { HomeAssistant } from "../../../types";
import type { MarketplaceData, MarketplaceInfo } from "./marketplace";
import type { MarketplaceDispatchEvent } from "./common";
import type { RepositoryBase } from "./repository";

export const fetchMarketplaceInfo = async (hass: HomeAssistant) =>
  hass.connection.sendMessagePromise<MarketplaceInfo>({
    type: "marketplace/info",
  });

export const getRepositories = async (hass: HomeAssistant) =>
  hass.connection.sendMessagePromise<RepositoryBase[]>({
    type: "marketplace/repositories/list",
  });

export const repositoryUninstall = async (
  hass: HomeAssistant,
  repository: string
) =>
  hass.connection.sendMessagePromise<unknown>({
    type: "marketplace/repository/remove",
    repository,
  });

export const repositoryAdd = async (
  hass: HomeAssistant,
  repository: string,
  category: string
) =>
  hass.connection.sendMessagePromise<null | Record<string, string>>({
    type: "marketplace/repositories/add",
    repository: repository,
    category,
  });

export const repositoryUpdate = async (
  hass: HomeAssistant,
  repository: string
) =>
  hass.connection.sendMessagePromise<unknown>({
    type: "marketplace/repository/refresh",
    repository,
  });

export const repositoryDelete = async (
  hass: HomeAssistant,
  repository: string
) =>
  hass.connection.sendMessagePromise<unknown>({
    type: "marketplace/repositories/remove",
    repository,
  });

export const repositoriesClearNew = async (
  hass: HomeAssistant,
  marketplace: MarketplaceData
) =>
  hass.connection.sendMessagePromise<unknown>({
    type: "marketplace/repositories/clear_new",
    categories: marketplace.info.categories,
  });

export const repositoriesClearNewRepository = async (
  hass: HomeAssistant,
  repository: string
) =>
  hass.connection.sendMessagePromise<unknown>({
    type: "marketplace/repositories/clear_new",
    repository,
  });

export const websocketSubscription = (
  hass: HomeAssistant,
  onChange: (result: Record<any, any> | null) => void,
  event: MarketplaceDispatchEvent
) =>
  hass.connection.subscribeMessage(onChange, {
    type: "marketplace/subscribe",
    signal: event,
  });
