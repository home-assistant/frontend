import type { LitElement } from "lit";
import {
  canDecryptBackupOnDownload,
  getBackupDownloadUrl,
  getPreferredAgentForDownload,
  type BackupContent,
} from "../../../../data/backup";
import type { HomeAssistant } from "../../../../types";
import {
  showAlertDialog,
  showPromptDialog,
} from "../../../lovelace/custom-card-helpers";
import { getSignedPath } from "../../../../data/auth";
import { fileDownload } from "../../../../util/file_download";

const requestEncryptionKey = async (
  hass: HomeAssistant,
  element: LitElement,
  backup: BackupContent,
  userProvided: boolean,
  agentId?: string
): Promise<void> => {
  const encryptionKey = await showPromptDialog(element, {
    title: hass.localize(
      "ui.panel.config.backup.dialogs.show_encryption_key.title"
    ),
    text: userProvided
      ? hass.localize(
          "ui.panel.config.backup.dialogs.download.incorrect_entered_encryption_key"
        )
      : hass.localize(
          "ui.panel.config.backup.dialogs.download.incorrect_current_encryption_key"
        ),
    inputLabel: hass.localize(
      "ui.panel.config.backup.dialogs.show_encryption_key.title"
    ),
    inputType: "password",
    confirmText: hass.localize("ui.common.download"),
  });
  if (!encryptionKey) {
    return;
  }
  downloadBackup(hass, element, backup, encryptionKey, agentId, true);
};

export const downloadBackup = async (
  hass: HomeAssistant,
  element: LitElement,
  backup: BackupContent,
  encryptionKey?: string | null,
  agentId?: string,
  userProvided = false
): Promise<void> => {
  const preferedAgent =
    agentId ?? getPreferredAgentForDownload(backup.agent_ids!);

  if (backup.protected) {
    if (encryptionKey) {
      try {
        await canDecryptBackupOnDownload(
          hass,
          backup.backup_id,
          preferedAgent,
          encryptionKey
        );
      } catch (err: any) {
        if (err?.code === "password_incorrect") {
          requestEncryptionKey(hass, element, backup, userProvided, agentId);
          return;
        }
        if (err?.code === "decrypt_not_supported") {
          showAlertDialog(element, {
            text: hass.localize(
              "ui.panel.config.backup.dialogs.download.decryption_unsupported"
            ),
          });
          encryptionKey = undefined;
        }
      }
    } else {
      requestEncryptionKey(hass, element, backup, userProvided, agentId);
      return;
    }
  }

  const signedUrl = await getSignedPath(
    hass,
    getBackupDownloadUrl(backup.backup_id, preferedAgent, encryptionKey)
  );
  fileDownload(signedUrl.path);
};
