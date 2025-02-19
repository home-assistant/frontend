import "@material/mwc-button";
import { mdiOpenInNew } from "@mdi/js";
import type { CSSResultGroup } from "lit";
import { css, html, LitElement, nothing } from "lit";
import { state } from "lit/decorators";
import { fireEvent } from "../../../../common/dom/fire_event";
import { createCloseHeading } from "../../../../components/ha-dialog";
import { showConfirmationDialog } from "../../../../dialogs/generic/show-dialog-box";
import { haStyle, haStyleDialog } from "../../../../resources/styles";
import type { HomeAssistant } from "../../../../types";
import { documentationUrl } from "../../../../util/documentation-url";
import type { WebhookDialogParams } from "./show-dialog-manage-cloudhook";

import "../../../../components/ha-copy-textfield";

export class DialogManageCloudhook extends LitElement {
  protected hass?: HomeAssistant;

  @state() private _params?: WebhookDialogParams;

  public showDialog(params: WebhookDialogParams) {
    this._params = params;
  }

  public closeDialog() {
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
      <ha-dialog
        open
        hideActions
        @closed=${this.closeDialog}
        .heading=${createCloseHeading(
          this.hass!,
          this.hass!.localize(
            "ui.panel.config.cloud.dialog_cloudhook.webhook_for",
            { name: webhook.name }
          )
        )}
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
            <br />
            <a href=${docsUrl} target="_blank" rel="noreferrer">
              ${this.hass!.localize(
                "ui.panel.config.cloud.dialog_cloudhook.view_documentation"
              )}
              <ha-svg-icon .path=${mdiOpenInNew}></ha-svg-icon>
            </a>
          </p>

          <ha-copy-textfield
            .hass=${this.hass}
            .value=${cloudhook.cloudhook_url}
            .label=${this.hass!.localize("ui.panel.config.common.copy_link")}
          ></ha-copy-textfield>
        </div>

        <a
          href=${docsUrl}
          target="_blank"
          rel="noreferrer"
          slot="secondaryAction"
        >
          <mwc-button>
            ${this.hass!.localize(
              "ui.panel.config.cloud.dialog_cloudhook.view_documentation"
            )}
          </mwc-button>
        </a>
        <mwc-button @click=${this.closeDialog} slot="primaryAction">
          ${this.hass!.localize("ui.panel.config.cloud.dialog_cloudhook.close")}
        </mwc-button>
      </ha-dialog>
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
        ha-dialog {
          width: 650px;
        }
        button.link {
          color: var(--primary-color);
          text-decoration: none;
        }
        a {
          text-decoration: none;
        }
        a ha-svg-icon {
          --mdc-icon-size: 16px;
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

customElements.define("dialog-manage-cloudhook", DialogManageCloudhook);
