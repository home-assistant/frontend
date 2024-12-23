import type { PageNavigation } from "../../layouts/hass-tabs-subpage";
import type { HomeAssistant } from "../../types";
import { ensureArray } from "../array/ensure-array";
import { isComponentLoaded } from "./is_component_loaded";

export const canShowPage = (hass: HomeAssistant, page: PageNavigation) =>
  (isCore(page) || isLoadedIntegration(hass, page)) &&
  !hideAdvancedPage(hass, page) &&
  isNotLoadedIntegration(hass, page);

export const isLoadedIntegration = (
  hass: HomeAssistant,
  page: PageNavigation
) =>
  !page.component ||
  ensureArray(page.component).some((integration) =>
    isComponentLoaded(hass, integration)
  );

export const isNotLoadedIntegration = (
  hass: HomeAssistant,
  page: PageNavigation
) =>
  !page.not_component ||
  !ensureArray(page.not_component).some((integration) =>
    isComponentLoaded(hass, integration)
  );

export const isCore = (page: PageNavigation) => page.core;
export const isAdvancedPage = (page: PageNavigation) => page.advancedOnly;
export const userWantsAdvanced = (hass: HomeAssistant) =>
  hass.userData?.showAdvanced;
export const hideAdvancedPage = (hass: HomeAssistant, page: PageNavigation) =>
  isAdvancedPage(page) && !userWantsAdvanced(hass);
