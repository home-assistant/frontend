import type { PageNavigation } from "../../layouts/hass-tabs-subpage";
import type { HomeAssistant, HomeAssistantConfig } from "../../types";
import { ensureArray } from "../array/ensure-array";
import { isComponentLoaded } from "./is_component_loaded";

export const canShowPage = (
  hass: HomeAssistantConfig & Pick<HomeAssistant, "entities">,
  page: PageNavigation
) =>
  (isCore(page) || isLoadedIntegration(hass, page)) &&
  (!page.filter || page.filter(hass));

export const isLoadedIntegration = (
  hass: HomeAssistantConfig,
  page: PageNavigation
) =>
  !page.component ||
  ensureArray(page.component).some((integration) =>
    isComponentLoaded(hass.config, integration)
  );

export const isCore = (page: PageNavigation) => page.core;
