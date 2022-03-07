import "@material/mwc-button";
import { css, CSSResultGroup, html, LitElement } from "lit";
import { query, state } from "lit/decorators";
import { fireEvent } from "../../../../common/dom/fire_event";
import { copyToClipboard } from "../../../../common/util/copy-clipboard";
import type { HaTextField } from "../../../../components/ha-textfield";
import "../../../../components/ha-textfield";
import { showConfirmationDialog } from "../../../../dialogs/generic/show-dialog-box";
import { haStyle, haStyleDialog } from "../../../../resources/styles";
import { HomeAssistant } from "../../../../types";
import { documentationUrl } from "../../../../util/documentation-url";
import { WebhookDialogParams } from "./show-dialog-manage-cloudhook";

const inputLabel = "Public URL – Click to copy to clipboard";

export class DialogManageCloudhook extends LitElement {
  protected hass?: HomeAssistant;

  @state() private _params?: WebhookDialogParams;

  @query("ha-textfield") _input!: HaTextField;

  public showDialog(params: WebhookDialogParams) {
    this._params = params;
  }

  public closeDialog() {
    this._params = undefined;
    fireEvent(this, "dialog-closed", { dialog: this.localName });
  }

  protected render() {
    if (!this._params) {
      return html``;
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
        .heading=${this.hass!.localize(
          "ui.panel.config.cloud.dialog_cloudhook.webhook_for",
          "name",
          webhook.name
        )}
      >
        <div>
          <p>
            ${this.hass!.localize(
              "ui.panel.config.cloud.dialog_cloudhook.available_at"
            )}
          </p>
          <ha-textfield
            .label=${inputLabel}
            .value=${cloudhook.cloudhook_url}
            @click=${this._copyClipboard}
            @blur=${this._restoreLabel}
          ></ha-textfield>
          <p>
            ${cloudhook.managed
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
    showConfirmationDialog(this, {
      text: this.hass!.localize(
        "ui.panel.config.cloud.dialog_cloudhook.confirm_disable"
      ),
      dismissText: this.hass!.localize("ui.common.cancel"),
      confirmText: this.hass!.localize("ui.common.disable"),
      confirm: () => {
        this._params!.disableHook();
        this.closeDialog();
      },
    });
  }

  private _copyClipboard(ev: FocusEvent) {
    const textField = ev.currentTarget as HaTextField;
    try {
      copyToClipboard(textField.value);
      textField.label = this.hass!.localize(
        "ui.panel.config.cloud.dialog_cloudhook.copied_to_clipboard"
      );
    } catch (err: any) {
      // Copying failed. Oh no
    }
  }

  private _restoreLabel() {
    this._input.label = inputLabel;
  }

  static get styles(): CSSResultGroup {
    return [
      haStyle,
      haStyleDialog,
      css`
        ha-dialog {
          width: 650px;
        }
        ha-textfield {
          display: block;
        }
        button.link {
          color: var(--primary-color);
        }
        a {
          text-decoration: none;
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
