import type { LitElement } from "lit";
import { getSignedPath } from "../../../../data/auth";
import type { BackupConfig, BackupContent } from "../../../../data/backup";
import {
  canDecryptBackupOnDownload,
  getBackupDownloadUrl,
  getPreferredAgentForDownload,
} from "../../../../data/backup";
import type { HomeAssistant } from "../../../../types";
import { fileDownload } from "../../../../util/file_download";
import { showAlertDialog } from "../../../lovelace/custom-card-helpers";
import { showDownloadDecryptedBackupDialog } from "../dialogs/show-dialog-download-decrypted-backup";

export const downloadBackupFile = async (
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

export const downloadBackup = async (
  hass: HomeAssistant,
  element: LitElement,
  backup: BackupContent,
  backupConfig?: BackupConfig,
  agentId?: string
): Promise<void> => {
  const agentIds = Object.keys(backup.agents);
  const preferedAgent = agentId ?? getPreferredAgentForDownload(agentIds);
  const isProtected = backup.agents[preferedAgent]?.protected;

  if (!isProtected) {
    downloadBackupFile(hass, backup.backup_id, preferedAgent);
    return;
  }

  const encryptionKey = backupConfig?.create_backup?.password;

  if (!encryptionKey) {
    showDownloadDecryptedBackupDialog(element, {
      backup,
      agentId: preferedAgent,
    });
    return;
  }

  try {
    // Check if we can decrypt it
    await canDecryptBackupOnDownload(
      hass,
      backup.backup_id,
      preferedAgent,
      encryptionKey
    );
    downloadBackupFile(hass, backup.backup_id, preferedAgent, encryptionKey);
  } catch (err: any) {
    // If encryption key is incorrect, ask for encryption key
    if (err?.code === "password_incorrect") {
      showDownloadDecryptedBackupDialog(element, {
        backup,
        agentId: preferedAgent,
      });
      return;
    }
    // If decryption is not supported, ask for confirmation and download it encrypted
    if (err?.code === "decrypt_not_supported") {
      showAlertDialog(element, {
        title: hass.localize(
          "ui.panel.config.backup.dialogs.download.decryption_unsupported_title"
        ),
        text: hass.localize(
          "ui.panel.config.backup.dialogs.download.decryption_unsupported"
        ),
        confirm() {
          downloadBackupFile(hass, backup.backup_id, preferedAgent);
        },
      });
      return;
    }

    // Else, show generic error
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
  }
};
