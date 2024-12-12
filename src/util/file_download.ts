import type { HomeAssistant } from "../types";
import { isIosApp } from "./is_ios";

export const fileDownload = (href: string, filename = ""): void => {
  const element = document.createElement("a");
  element.target = "_blank";
  element.href = href;
  element.download = filename;
  element.style.display = "none";
  document.body.appendChild(element);
  element.dispatchEvent(new MouseEvent("click"));
  document.body.removeChild(element);
};

export const downloadFileSupported = (hass: HomeAssistant): boolean =>
  !isIosApp(hass) || !!hass.auth.external?.config.downloadFileSupported;
