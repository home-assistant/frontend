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
  showConfirmationDialog,
  showPromptDialog,
} from "../../../lovelace/custom-card-helpers";
import { getSignedPath } from "../../../../data/auth";
import { fileDownload } from "../../../../util/file_download";

const triggerDownload = async (
  hass: HomeAssistant,
  backupId: string,
  preferedAgent: string,
  encryptionKey?: string | null
) => {
  const signedUrl = await getSignedPath(
    hass,
    getBackupDownloadUrl(backupId, preferedAgent, encryptionKey)
  );
  fileDownload(signedUrl.path);
};

const downloadEncryptedBackup = async (
  hass: HomeAssistant,
  element: LitElement,
  backup: BackupContent,
  agentId?: string
) => {
  if (
    await showConfirmationDialog(element, {
      title: "Encryption key incorrect",
      text: hass.localize(
        "ui.panel.config.backup.dialogs.download.incorrect_entered_encryption_key"
      ),
      confirmText: "Download encrypted",
    })
  ) {
    const agentIds = Object.keys(backup.agents);
    const preferedAgent = agentId ?? getPreferredAgentForDownload(agentIds);

    triggerDownload(hass, backup.backup_id, preferedAgent);
  }
};

const requestEncryptionKey = async (
  hass: HomeAssistant,
  element: LitElement,
  backup: BackupContent,
  agentId?: string
): Promise<void> => {
  const encryptionKey = await showPromptDialog(element, {
    title: hass.localize(
      "ui.panel.config.backup.dialogs.show_encryption_key.title"
    ),
    text: hass.localize(
      "ui.panel.config.backup.dialogs.download.incorrect_current_encryption_key"
    ),
    inputLabel: hass.localize(
      "ui.panel.config.backup.dialogs.show_encryption_key.title"
    ),
    inputType: "password",
    confirmText: hass.localize("ui.common.download"),
  });
  if (encryptionKey === null) {
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
  const agentIds = Object.keys(backup.agents);
  const preferedAgent = agentId ?? getPreferredAgentForDownload(agentIds);
  const isProtected = backup.agents[preferedAgent]?.protected;

  if (isProtected) {
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
          if (userProvided) {
            downloadEncryptedBackup(hass, element, backup, agentId);
          } else {
            requestEncryptionKey(hass, element, backup, agentId);
          }
          return;
        }
        if (err?.code === "decrypt_not_supported") {
          showAlertDialog(element, {
            title: hass.localize(
              "ui.panel.config.backup.dialogs.download.decryption_unsupported_title"
            ),
            text: hass.localize(
              "ui.panel.config.backup.dialogs.download.decryption_unsupported"
            ),
            confirm() {
              triggerDownload(hass, backup.backup_id, preferedAgent);
            },
          });
          encryptionKey = undefined;
          return;
        }

        showAlertDialog(element, {
          title: hass.localize(
            "ui.panel.config.backup.dialogs.download.error_check_title",
            {
              error: err.message,
            }
          ),
          text: hass.localize(
            "ui.panel.config.backup.dialogs.download.error_check_description",
            {
              error: err.message,
            }
          ),
        });
        return;
      }
    } else {
      requestEncryptionKey(hass, element, backup, agentId);
      return;
    }
  }

  await triggerDownload(hass, backup.backup_id, preferedAgent, encryptionKey);
};
