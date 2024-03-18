import { PageNavigation } from "../../layouts/hass-tabs-subpage";
import { HomeAssistant } from "../../types";
import { ensureArray } from "../array/ensure-array";
import { isComponentLoaded } from "./is_component_loaded";

export const canShowPage = (hass: HomeAssistant, page: PageNavigation) =>
  (isCore(page) || isLoadedIntegration(hass, page)) &&
  !hideAdvancedPage(hass, page) &&
  isNotLoadedIntegration(hass, page);

const isLoadedIntegration = (hass: HomeAssistant, page: PageNavigation) =>
  !page.component ||
  ensureArray(page.component).some((integration) =>
    isComponentLoaded(hass, integration)
  );

const isNotLoadedIntegration = (hass: HomeAssistant, page: PageNavigation) =>
  !page.not_component ||
  !ensureArray(page.not_component).some((integration) =>
    isComponentLoaded(hass, integration)
  );

const isCore = (page: PageNavigation) => page.core;
const isAdvancedPage = (page: PageNavigation) => page.advancedOnly;
const userWantsAdvanced = (hass: HomeAssistant) => hass.userData?.showAdvanced;
const hideAdvancedPage = (hass: HomeAssistant, page: PageNavigation) =>
  isAdvancedPage(page) && !userWantsAdvanced(hass);
