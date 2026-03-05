import { mdiOpenInNew } from "@mdi/js";
import type { CSSResultGroup } from "lit";
import { css, html, LitElement, nothing } from "lit";
import { customElement, state } from "lit/decorators";
import { fireEvent } from "../../../../common/dom/fire_event";
import "../../../../components/ha-dialog-footer";
import { showConfirmationDialog } from "../../../../dialogs/generic/show-dialog-box";
import { haStyle, haStyleDialog } from "../../../../resources/styles";
import type { HomeAssistant } from "../../../../types";
import { documentationUrl } from "../../../../util/documentation-url";
import type { WebhookDialogParams } from "./show-dialog-manage-cloudhook";

import "../../../../components/ha-button";
import "../../../../components/ha-copy-textfield";
import "../../../../components/ha-wa-dialog";

@customElement("dialog-manage-cloudhook")
export class DialogManageCloudhook extends LitElement {
  protected hass?: HomeAssistant;

  @state() private _params?: WebhookDialogParams;

  @state() private _open = false;

  public showDialog(params: WebhookDialogParams) {
    this._params = params;
    this._open = true;
  }

  public closeDialog() {
    this._open = false;
  }

  private _dialogClosed() {
    this._open = false;
    this._params = undefined;
    fireEvent(this, "dialog-closed", { dialog: this.localName });
  }

  protected render() {
    if (!this._params) {
      return nothing;
    }
    const { webhook, cloudhook } = this._params;
    const docsUrl =
      webhook.domain === "automation"
        ? documentationUrl(
            this.hass!,
            "/docs/automation/trigger/#webhook-trigger"
          )
        : documentationUrl(this.hass!, `/integrations/${webhook.domain}/`);
    return html`
      <ha-wa-dialog
        .hass=${this.hass}
        .open=${this._open}
        header-title=${this.hass!.localize(
          "ui.panel.config.cloud.dialog_cloudhook.webhook_for",
          { name: webhook.name }
        )}
        @closed=${this._dialogClosed}
      >
        <div>
          <p>
            ${!cloudhook.managed
              ? html`
                  ${this.hass!.localize(
                    "ui.panel.config.cloud.dialog_cloudhook.managed_by_integration"
                  )}
                `
              : html`
                  ${this.hass!.localize(
                    "ui.panel.config.cloud.dialog_cloudhook.info_disable_webhook"
                  )}
                  <button class="link" @click=${this._disableWebhook}>
                    ${this.hass!.localize(
                      "ui.panel.config.cloud.dialog_cloudhook.link_disable_webhook"
                    )}</button
                  >.
                `}
          </p>

          <ha-copy-textfield
            .hass=${this.hass}
            .value=${cloudhook.cloudhook_url}
            .label=${this.hass!.localize("ui.panel.config.common.copy_link")}
          ></ha-copy-textfield>
        </div>

        <ha-dialog-footer slot="footer">
          <ha-button
            slot="secondaryAction"
            href=${docsUrl}
            target="_blank"
            rel="noreferrer"
            appearance="plain"
          >
            ${this.hass!.localize(
              "ui.panel.config.cloud.dialog_cloudhook.view_documentation"
            )}
            <ha-svg-icon slot="end" .path=${mdiOpenInNew}></ha-svg-icon>
          </ha-button>
          <ha-button slot="primaryAction" @click=${this.closeDialog}>
            ${this.hass!.localize(
              "ui.panel.config.cloud.dialog_cloudhook.close"
            )}
          </ha-button>
        </ha-dialog-footer>
      </ha-wa-dialog>
    `;
  }

  private async _disableWebhook() {
    const confirmed = await showConfirmationDialog(this, {
      title: this.hass!.localize(
        "ui.panel.config.cloud.dialog_cloudhook.confirm_disable_title"
      ),
      text: this.hass!.localize(
        "ui.panel.config.cloud.dialog_cloudhook.confirm_disable_text",
        { name: this._params!.webhook.name }
      ),
      dismissText: this.hass!.localize("ui.common.cancel"),
      confirmText: this.hass!.localize("ui.common.disable"),
      destructive: true,
    });
    if (confirmed) {
      this._params!.disableHook();
      this.closeDialog();
    }
  }

  static get styles(): CSSResultGroup {
    return [
      haStyle,
      haStyleDialog,
      css`
        button.link {
          color: var(--primary-color);
          text-decoration: none;
        }
        p {
          margin-top: 0;
          margin-bottom: 16px;
        }
      `,
    ];
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "dialog-manage-cloudhook": DialogManageCloudhook;
  }
}
