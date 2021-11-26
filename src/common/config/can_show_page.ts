import { PageNavigation } from "../../layouts/hass-tabs-subpage";
import { HomeAssistant } from "../../types";
import { isComponentLoaded } from "./is_component_loaded";

export const canShowPage = (hass: HomeAssistant, page: PageNavigation) =>
  (isCore(page) || isLoadedIntegration(hass, page)) &&
  !hideAdvancedPage(hass, page);

const isLoadedIntegration = (hass: HomeAssistant, page: PageNavigation) =>
  page.component
    ? isComponentLoaded(hass, page.component)
    : page.components
    ? page.components.some((integration) =>
        isComponentLoaded(hass, integration)
      )
    : true;
const isCore = (page: PageNavigation) => page.core;
const isAdvancedPage = (page: PageNavigation) => page.advancedOnly;
const userWantsAdvanced = (hass: HomeAssistant) => hass.userData?.showAdvanced;
const hideAdvancedPage = (hass: HomeAssistant, page: PageNavigation) =>
  isAdvancedPage(page) && !userWantsAdvanced(hass);
