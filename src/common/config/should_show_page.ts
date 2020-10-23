import { isComponentLoaded } from "./is_component_loaded";
import { PageNavigation } from "../../layouts/hass-tabs-subpage";
import { HomeAssistant } from "../../types";

export const shouldShowPage = (hass: HomeAssistant, page: PageNavigation) => {
  return (
    (!page.component || page.core || isComponentLoaded(hass, page.component)) &&
    (!page.advancedOnly || hass.userData?.showAdvanced)
  );
};
