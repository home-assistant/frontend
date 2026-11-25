import { showAlertDialog } from "../dialogs/generic/show-dialog-box";
import type { HomeAssistant } from "../types";
import { fileDownload } from "../util/file_download";
import { getSignedPath } from "./auth";
import {
  getCoreLogFileDownloadUnavailableReason,
  getErrorLogDownloadUrl,
} from "./error_log";

/**
 * Returns whether the core log file can be downloaded.
 * If not, explains why to the user in an alert dialog.
 */
export const checkDebugLogDownloadAvailable = (
  element: HTMLElement,
  hass: HomeAssistant
): boolean => {
  const reason = getCoreLogFileDownloadUnavailableReason(hass);
  if (!reason) {
    return true;
  }
  showAlertDialog(element, {
    title: hass.localize("ui.panel.config.logs.log_file_disabled_title"),
    text: hass.localize(
      `ui.panel.config.logs.log_file_disabled_debug_download.${reason}`
    ),
  });
  return false;
};

export const downloadIntegrationDebugLog = async (
  hass: HomeAssistant,
  domain: string
) => {
  const timeString = new Date().toISOString().replace(/:/g, "-");
  const logFileName = `home-assistant_${domain}_${timeString}.log`;
  const signedUrl = await getSignedPath(hass, getErrorLogDownloadUrl(hass));
  fileDownload(signedUrl.path, logFileName);
};
