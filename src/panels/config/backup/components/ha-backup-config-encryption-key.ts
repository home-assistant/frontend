import { mdiDownload } from "@mdi/js";
import { css, html, LitElement } from "lit";
import { customElement, property, state } from "lit/decorators";
import { fireEvent } from "../../../../common/dom/fire_event";
import "../../../../components/ha-md-list";
import "../../../../components/ha-md-list-item";
import type { HomeAssistant } from "../../../../types";
import { showChangeBackupPasswordDialog } from "../dialogs/show-dialog-change-backup-password";

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
        <ha-md-list>
          <ha-md-list-item>
            <span slot="headline">Download emergency kit</span>
            <span slot="supporting-text">
              We recommend to save this encryption key somewhere secure.
            </span>
            <ha-button slot="end" @click=${this._download}>
              <ha-svg-icon .path=${mdiDownload} slot="icon"></ha-svg-icon>
              Download
            </ha-button>
          </ha-md-list-item>

          <ha-md-list-item>
            <span slot="headline">Change encryption key</span>
            <span slot="supporting-text">
              All next backups will use this encryption key.
            </span>
            <ha-button class="danger" slot="end" @click=${this._change}>
              Change
            </ha-button>
          </ha-md-list-item>
        </ha-md-list>
      `;
    }

    return html`
      <ha-md-list>
        <ha-md-list-item>
          <span slot="headline">Set encryption key</span>
          <span slot="supporting-text">
            Set an encryption key for your backups.
          </span>
          <ha-button unelevated slot="end" @click=${this._change}>
            Set
          </ha-button>
        </ha-md-list-item>
      </ha-md-list>
    `;
  }

  private _download() {
    if (!this._value) {
      return;
    }
    const element = document.createElement("a");
    element.setAttribute(
      "href",
      "data:text/plain;charset=utf-8," + encodeURIComponent(this._value)
    );
    element.setAttribute("download", "emergency_kit.txt");

    element.style.display = "none";
    document.body.appendChild(element);

    element.click();

    document.body.removeChild(element);
  }

  private async _change() {
    const result = await showChangeBackupPasswordDialog(this, {
      currentPassword: this._value ?? undefined,
    });
    if (result === null) {
      return;
    }
    fireEvent(this, "value-changed", { value: result });
  }

  static styles = css`
    ha-md-list {
      background: none;
      --md-list-item-leading-space: 0;
      --md-list-item-trailing-space: 0;
    }
    .danger {
      --mdc-theme-primary: var(--error-color);
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-backup-config-encryption-key": HaBackupConfigEncryptionKey;
  }
}
