import type { HomeAssistant } from "../types";
import { isIosApp } from "./is_ios";

export const fileDownload = (href: string, filename = ""): void => {
  const a = document.createElement("a");
  a.target = "_blank";
  a.href = href;
  a.download = filename;

  document.body.appendChild(a);
  a.dispatchEvent(new MouseEvent("click"));
  document.body.removeChild(a);
};

export const downloadFileSupported = (hass: HomeAssistant): boolean =>
  !isIosApp(hass) || !!hass.auth.external?.config.downloadFileSupported;
