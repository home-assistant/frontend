import type { HomeAssistant } from "../types";
import { isSafari } from "./is_safari";

export const isIosApp = (
  authExternal: HomeAssistant["auth"]["external"]
): boolean => !!authExternal && isSafari;

export const isIosDevice = (): boolean =>
  /iphone|ipad|ipod/i.test(navigator.userAgent) ||
  (/macintosh/i.test(navigator.userAgent) && navigator.maxTouchPoints > 1);
