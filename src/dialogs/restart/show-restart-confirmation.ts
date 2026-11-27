import { html, nothing } from "lit";
import "../../components/ha-alert";
import {
  getBackupState,
  type BackupManagerState,
} from "../../data/backup_manager";
import type { HomeAssistant } from "../../types";
import {
  showAlertDialog,
  showConfirmationDialog,
} from "../generic/show-dialog-box";
import "./automation-restart-status";
import { showRestartWaitDialog } from "./show-dialog-restart";

export type RestartAction =
  "restart" | "reboot" | "shutdown" | "restart-safe-mode";
type ConfirmationContext = Pick<HomeAssistant, "connection" | "localize">;

function getBackupProgressMessage(
  localize: HomeAssistant["localize"],
  backupState: BackupManagerState
) {
  switch (backupState) {
    case "create_backup":
      return localize("ui.dialogs.restart.backup_in_progress");
    case "receive_backup":
      return localize("ui.dialogs.restart.upload_in_progress");
    case "restore_backup":
      return localize("ui.dialogs.restart.restore_in_progress");
    default:
      return "";
  }
}

export async function confirmRestartAction(
  element: HTMLElement,
  hass: ConfirmationContext,
  action: RestartAction,
  run: () => Promise<void>
) {
  const backupState = await getBackupState(hass).catch(() => "idle" as const);
  const backupProgressMessage = getBackupProgressMessage(
    hass.localize,
    backupState
  );
  const confirmed = await showConfirmationDialog(element, {
    title: hass.localize(`ui.dialogs.restart.${action}.confirm_title`),
    text: html`${hass.localize(
        `ui.dialogs.restart.${action}.confirm_description`
      )}${
        backupProgressMessage
          ? html`<br /><br /><ha-alert>${backupProgressMessage}</ha-alert>`
          : nothing
      } <br /><br /><automation-restart-status></automation-restart-status>`,
    confirmText: hass.localize(
      `ui.dialogs.restart.${action}.confirm_action${backupState === "idle" ? "" : "_backup"}`
    ),
    destructive: true,
  });

  if (!confirmed) {
    return false;
  }

  if (backupState !== "idle") {
    showRestartWaitDialog(element, {
      title: hass.localize(`ui.dialogs.restart.${action}.title`),
      initialBackupState: backupState,
      action: run,
    });
  } else {
    run();
  }
  return true;
}

export function showRestartConfirmation(
  element: HTMLElement,
  hass: ConfirmationContext & Pick<HomeAssistant, "callService">,
  action: "restart" | "restart-safe-mode" = "restart"
) {
  return confirmRestartAction(element, hass, action, async () => {
    try {
      await hass.callService(
        "homeassistant",
        "restart",
        action === "restart-safe-mode" ? { safe_mode: true } : undefined
      );
    } catch (err: any) {
      showAlertDialog(element, {
        title: hass.localize(`ui.dialogs.restart.${action}.failed`),
        text: err.message,
      });
    }
  });
}
