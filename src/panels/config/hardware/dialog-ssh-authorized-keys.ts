import type { CSSResultGroup } from "lit";
import { css, html, LitElement } from "lit";
import { customElement, property, state } from "lit/decorators";
import { fireEvent } from "../../../common/dom/fire_event";
import "../../../components/ha-alert";
import "../../../components/ha-button";
import "../../../components/ha-dialog";
import "../../../components/ha-dialog-footer";
import "../../../components/ha-textarea";
import type { HaTextArea } from "../../../components/ha-textarea";
import { extractApiErrorMessage } from "../../../data/hassio/common";
import { setOSSSHAuthorizedKeys } from "../../../data/hassio/host";
import {
  showAlertDialog,
  showConfirmationDialog,
} from "../../../dialogs/generic/show-dialog-box";
import { DirtyStateProviderMixin } from "../../../mixins/dirty-state-provider-mixin";
import { haStyle, haStyleDialog } from "../../../resources/styles";
import type { HomeAssistant } from "../../../types";

interface SSHAuthorizedKeysFormState {
  keys: string;
}

@customElement("dialog-ssh-authorized-keys")
class DialogSSHAuthorizedKeys extends DirtyStateProviderMixin<SSHAuthorizedKeysFormState>()(
  LitElement
) {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @state() private _open = false;

  @state() private _keys = "";

  @state() private _saving = false;

  public showDialog(): void {
    this._open = true;
    this._keys = "";
    this._initDirtyTracking({ type: "shallow" }, { keys: this._keys });
  }

  public closeDialog(): void {
    this._open = false;
  }

  private _dialogClosed(): void {
    this._keys = "";
    this._saving = false;
    fireEvent(this, "dialog-closed", { dialog: this.localName });
  }

  protected render() {
    return html`
      <ha-dialog
        .open=${this._open}
        header-title=${this.hass.localize(
          "ui.panel.config.hardware.ssh_authorized_keys.dialog_title"
        )}
        .preventScrimClose=${this.isDirtyState}
        @closed=${this._dialogClosed}
      >
        <p>
          ${this.hass.localize(
            "ui.panel.config.hardware.ssh_authorized_keys.dialog_description"
          )}
        </p>
        <ha-alert alert-type="warning">
          ${this.hass.localize(
            "ui.panel.config.hardware.ssh_authorized_keys.replace_warning"
          )}
        </ha-alert>
        <ha-textarea
          autofocus
          rows="5"
          .label=${this.hass.localize(
            "ui.panel.config.hardware.ssh_authorized_keys.keys_label"
          )}
          placeholder="ssh-ed25519 AAAA…"
          .value=${this._keys}
          .disabled=${this._saving}
          @input=${this._keysChanged}
        ></ha-textarea>
        <ha-dialog-footer slot="footer">
          <ha-button
            slot="secondaryAction"
            appearance="plain"
            .disabled=${this._saving}
            @click=${this.closeDialog}
          >
            ${this.hass.localize("ui.common.cancel")}
          </ha-button>
          <ha-button
            slot="primaryAction"
            .loading=${this._saving}
            @click=${this._save}
          >
            ${this.hass.localize("ui.common.save")}
          </ha-button>
        </ha-dialog-footer>
      </ha-dialog>
    `;
  }

  private _keysChanged(ev: InputEvent): void {
    this._keys = (ev.target as HaTextArea).value || "";
    this._updateDirtyState({ keys: this._keys });
  }

  private async _save(): Promise<void> {
    const keys = this._keys
      .split("\n")
      .map((line) => line.trim())
      .filter((line) => line);

    if (!keys.length) {
      const confirmed = await showConfirmationDialog(this, {
        title: this.hass.localize(
          "ui.panel.config.hardware.ssh_authorized_keys.delete_all_title"
        ),
        text: this.hass.localize(
          "ui.panel.config.hardware.ssh_authorized_keys.delete_all_text"
        ),
        confirmText: this.hass.localize("ui.common.delete"),
        dismissText: this.hass.localize("ui.common.cancel"),
        destructive: true,
      });
      if (!confirmed) {
        return;
      }
    }

    this._saving = true;
    try {
      await setOSSSHAuthorizedKeys(this.hass, keys);
      this.closeDialog();
    } catch (err: any) {
      showAlertDialog(this, {
        title: this.hass.localize(
          "ui.panel.config.hardware.ssh_authorized_keys.failed_to_save"
        ),
        text: extractApiErrorMessage(err),
      });
    } finally {
      this._saving = false;
    }
  }

  static get styles(): CSSResultGroup {
    return [
      haStyle,
      haStyleDialog,
      css`
        p {
          margin-top: 0;
        }
        ha-alert {
          display: block;
          margin-bottom: 16px;
        }
        ha-textarea {
          width: 100%;
        }
      `,
    ];
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "dialog-ssh-authorized-keys": DialogSSHAuthorizedKeys;
  }
}
