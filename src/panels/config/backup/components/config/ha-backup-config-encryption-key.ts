import { mdiDownload } from "@mdi/js";
import { css, html, LitElement } from "lit";
import { customElement, property, state } from "lit/decorators";
import { fireEvent } from "../../../../../common/dom/fire_event";
import "../../../../../components/item/ha-list-item-base";
import "../../../../../components/list/ha-list-base";
import type { HomeAssistant } from "../../../../../types";
import { showChangeBackupEncryptionKeyDialog } from "../../dialogs/show-dialog-change-backup-encryption-key";
import { showSetBackupEncryptionKeyDialog } from "../../dialogs/show-dialog-set-backup-encryption-key";

import { downloadEmergencyKit } from "../../../../../data/backup";
import { showShowBackupEncryptionKeyDialog } from "../../dialogs/show-dialog-show-backup-encryption-key";

@customElement("ha-backup-config-encryption-key")
class HaBackupConfigEncryptionKey extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @state() private value?: string;

  private get _value() {
    return this.value ?? "";
  }

  protected render() {
    if (this._value) {
      return html`
        <ha-list-base>
          <ha-list-item-base>
            <span slot="headline">
              ${this.hass.localize(
                "ui.panel.config.backup.encryption_key.download_emergency_kit"
              )}
            </span>
            <span slot="supporting-text">
              ${this.hass.localize(
                "ui.panel.config.backup.encryption_key.download_emergency_kit_description"
              )}
            </span>
            <ha-button
              appearance="plain"
              slot="end"
              @click=${this._download}
              size="small"
            >
              <ha-svg-icon .path=${mdiDownload} slot="start"></ha-svg-icon>
              ${this.hass.localize(
                "ui.panel.config.backup.encryption_key.download_emergency_kit_action"
              )}
            </ha-button>
          </ha-list-item-base>
          <ha-list-item-base>
            <span slot="headline">
              ${this.hass.localize(
                "ui.panel.config.backup.encryption_key.show_encryption_key"
              )}
            </span>
            <span slot="supporting-text">
              ${this.hass.localize(
                "ui.panel.config.backup.encryption_key.show_encryption_key_description"
              )}
            </span>
            <ha-button
              appearance="plain"
              slot="end"
              @click=${this._show}
              size="small"
            >
              ${this.hass.localize(
                "ui.panel.config.backup.encryption_key.show_encryption_key_action"
              )}
            </ha-button>
          </ha-list-item-base>
          <ha-list-item-base>
            <span slot="headline">
              ${this.hass.localize(
                "ui.panel.config.backup.encryption_key.change_encryption_key"
              )}
            </span>
            <span slot="supporting-text">
              ${this.hass.localize(
                "ui.panel.config.backup.encryption_key.change_encryption_key_description"
              )}
            </span>
            <ha-button
              appearance="plain"
              variant="danger"
              size="small"
              slot="end"
              @click=${this._change}
            >
              ${this.hass.localize(
                "ui.panel.config.backup.encryption_key.change_encryption_key_action"
              )}
            </ha-button>
          </ha-list-item-base>
        </ha-list-base>
      `;
    }

    return html`
      <ha-list-base>
        <ha-list-item-base>
          <span slot="headline">
            ${this.hass.localize(
              "ui.panel.config.backup.encryption_key.set_encryption_key"
            )}</span
          >
          <span slot="supporting-text">
            ${this.hass.localize(
              "ui.panel.config.backup.encryption_key.set_encryption_key_description"
            )}
          </span>
          <ha-button slot="end" @click=${this._set}>
            ${this.hass.localize(
              "ui.panel.config.backup.encryption_key.set_encryption_key_action"
            )}</ha-button
          >
        </ha-list-item-base>
      </ha-list-base>
    `;
  }

  private _download() {
    if (!this._value) {
      return;
    }
    downloadEmergencyKit(this.hass, this._value);
  }

  private _show() {
    showShowBackupEncryptionKeyDialog(this, { currentKey: this._value });
  }

  private _change() {
    showChangeBackupEncryptionKeyDialog(this, {
      currentKey: this._value,
      saveKey: (key) => {
        fireEvent(this, "value-changed", { value: key });
      },
    });
  }

  private _set() {
    showSetBackupEncryptionKeyDialog(this, {
      saveKey: (key) => {
        fireEvent(this, "value-changed", { value: key });
      },
    });
  }

  static styles = css`
    ha-list-base {
      --ha-row-item-padding-inline: 0;
    }
    ha-list-item-base::part(headline),
    ha-list-item-base::part(supporting-text) {
      white-space: wrap;
    }
    ha-button[size="small"] ha-svg-icon {
      --mdc-icon-size: 16px;
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-backup-config-encryption-key": HaBackupConfigEncryptionKey;
  }
}
