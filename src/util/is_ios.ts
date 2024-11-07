import type { HomeAssistant } from "../types";
import { isSafari } from "./is_safari";

export const isIosApp = (hass: HomeAssistant): boolean =>
  isSafari && !!hass.auth.external;
