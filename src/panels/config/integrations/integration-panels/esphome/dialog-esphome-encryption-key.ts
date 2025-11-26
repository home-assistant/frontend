import { mdiClose, mdiContentCopy } from "@mdi/js";
import type { CSSResultGroup } from "lit";
import { css, html, LitElement, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import { fireEvent } from "../../../../../common/dom/fire_event";
import { copyToClipboard } from "../../../../../common/util/copy-clipboard";
import "../../../../../components/ha-button";
import "../../../../../components/ha-dialog-footer";
import "../../../../../components/ha-dialog-header";
import "../../../../../components/ha-icon-button";
import "../../../../../components/ha-wa-dialog";
import { haStyleDialog } from "../../../../../resources/styles";
import type { HomeAssistant } from "../../../../../types";
import { showToast } from "../../../../../util/toast";
import type { ESPHomeEncryptionKeyDialogParams } from "./show-dialog-esphome-encryption-key";

@customElement("dialog-esphome-encryption-key")
class DialogESPHomeEncryptionKey extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @state() private _params?: ESPHomeEncryptionKeyDialogParams;

  public async showDialog(
    params: ESPHomeEncryptionKeyDialogParams
  ): Promise<void> {
    this._params = params;
  }

  public closeDialog(): void {
    this._params = undefined;
    fireEvent(this, "dialog-closed", { dialog: this.localName });
  }

  protected render() {
    if (!this._params) {
      return nothing;
    }

    return html`
      <ha-wa-dialog
        open
        @closed=${this.closeDialog}
        header-title=${this.hass.localize(
          "ui.panel.config.devices.esphome.encryption_key_title"
        )}
      >
        <ha-dialog-header slot="heading">
          <ha-icon-button
            slot="navigationIcon"
            dialogAction="cancel"
            .label=${this.hass.localize("ui.common.close")}
            .path=${mdiClose}
          ></ha-icon-button>
          <span slot="title">
            ${this.hass.localize(
              "ui.panel.config.devices.esphome.encryption_key_title"
            )}
          </span>
        </ha-dialog-header>

        <div class="content">
          <p>
            ${this.hass.localize(
              "ui.panel.config.devices.esphome.encryption_key_description"
            )}
          </p>
          <div class="key-row">
            <div class="key-container">
              <code>${this._params.encryption_key}</code>
            </div>
            <ha-icon-button
              @click=${this._copyToClipboard}
              .label=${this.hass.localize("ui.common.copy")}
              .path=${mdiContentCopy}
            ></ha-icon-button>
          </div>
        </div>
        <ha-dialog-footer slot="footer">
          <ha-button slot="primaryAction" data-dialog="close">
            ${this.hass.localize("ui.common.close")}
          </ha-button>
        </ha-dialog-footer>
      </ha-wa-dialog>
    `;
  }

  private async _copyToClipboard(): Promise<void> {
    if (!this._params?.encryption_key) {
      return;
    }

    await copyToClipboard(this._params.encryption_key);
    showToast(this, {
      message: this.hass.localize("ui.common.copied_clipboard"),
    });
  }

  static get styles(): CSSResultGroup {
    return [
      haStyleDialog,
      css`
        .content {
          display: flex;
          flex-direction: column;
          gap: var(--ha-space-6);
        }

        .key-row {
          display: flex;
          gap: var(--ha-space-2);
          align-items: center;
        }

        .key-container {
          flex: 1;
          border-radius: var(--ha-space-2);
          border: 1px solid var(--divider-color);
          background-color: var(
            --code-editor-background-color,
            var(--secondary-background-color)
          );
          padding: var(--ha-space-3);
          overflow: auto;
        }

        p {
          margin: 0;
          color: var(--secondary-text-color);
          line-height: var(--ha-line-height-condensed);
        }
      `,
    ];
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "dialog-esphome-encryption-key": DialogESPHomeEncryptionKey;
  }
}
