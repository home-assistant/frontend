import { html, LitElement, PropertyValues, property } from "lit-element";
import "@polymer/paper-item/paper-item";
import "@polymer/paper-item/paper-item-body";
import "@polymer/paper-spinner/paper-spinner";

import "../../../../components/ha-card";
import "../../../../components/ha-switch";

import { HomeAssistant, WebhookError } from "../../../../types";
import { Webhook, fetchWebhooks } from "../../../../data/webhook";
import {
  createCloudhook,
  deleteCloudhook,
  CloudWebhook,
  CloudStatusLoggedIn,
} from "../../../../data/cloud";
import { showManageCloudhookDialog } from "../dialog-manage-cloudhook/show-dialog-manage-cloudhook";

export class CloudWebhooks extends LitElement {
  @property() public hass?: HomeAssistant;
  @property() public cloudStatus?: CloudStatusLoggedIn;
  @property() private _cloudHooks?: { [webhookId: string]: CloudWebhook };
  @property() private _localHooks?: Webhook[];
  @property() private _progress: string[];

  constructor() {
    super();
    this._progress = [];
  }

  public connectedCallback() {
    super.connectedCallback();
    this._fetchData();
  }

  protected render() {
    return html`
      ${this.renderStyle()}
      <ha-card
        header=${this.hass!.localize(
          "ui.panel.config.cloud.account.webhooks.title"
        )}
      >
        <div class="card-content">
          ${this.hass!.localize("ui.panel.config.cloud.account.webhooks.info")}
          ${this._renderBody()}

          <div class="footer">
            <a href="https://www.nabucasa.com/config/webhooks" target="_blank">
              ${this.hass!.localize(
                "ui.panel.config.cloud.account.webhooks.link_learn_more"
              )}
            </a>
          </div>
        </div>
      </ha-card>
    `;
  }

  protected updated(changedProps: PropertyValues) {
    super.updated(changedProps);
    if (changedProps.has("cloudStatus") && this.cloudStatus) {
      this._cloudHooks = this.cloudStatus.prefs.cloudhooks || {};
    }
  }

  private _renderBody() {
    if (!this.cloudStatus || !this._localHooks || !this._cloudHooks) {
      return html`
        <div class="body-text">
          ${this.hass!.localize(
            "ui.panel.config.cloud.account.webhooks.loading"
          )}
        </div>
      `;
    }

    if (this._localHooks.length === 0) {
      return html`
        <div class="body-text">
          ${this.hass!.localize(
            "ui.panel.config.cloud.account.webhooks.no_hooks_yet"
          )}
          <a href="/config/integrations"
            >${this.hass!.localize(
              "ui.panel.config.cloud.account.webhooks.no_hooks_yet_link_integration"
            )}</a
          >
          ${this.hass!.localize(
            "ui.panel.config.cloud.account.webhooks.no_hooks_yet2"
          )}
          <a href="/config/automation/new"
            >${this.hass!.localize(
              "ui.panel.config.cloud.account.webhooks.no_hooks_yet_link_automation"
            )}</a
          >.
        </div>
      `;
    }

    return this._localHooks.map(
      (entry) => html`
        <div class="webhook" .entry="${entry}">
          <paper-item-body two-line>
            <div>
              ${entry.name}
              ${entry.domain === entry.name.toLowerCase()
                ? ""
                : ` (${entry.domain})`}
            </div>
            <div secondary>${entry.webhook_id}</div>
          </paper-item-body>
          ${this._progress.includes(entry.webhook_id)
            ? html`
                <div class="progress">
                  <paper-spinner active></paper-spinner>
                </div>
              `
            : this._cloudHooks![entry.webhook_id]
            ? html`
                <mwc-button @click="${this._handleManageButton}">
                  ${this.hass!.localize(
                    "ui.panel.config.cloud.account.webhooks.manage"
                  )}
                </mwc-button>
              `
            : html`
                <ha-switch @click="${this._enableWebhook}"></ha-switch>
              `}
        </div>
      `
    );
  }

  private _showDialog(webhookId: string) {
    const webhook = this._localHooks!.find(
      (ent) => ent.webhook_id === webhookId
    )!;
    const cloudhook = this._cloudHooks![webhookId];
    showManageCloudhookDialog(this, {
      webhook,
      cloudhook,
      disableHook: () => this._disableWebhook(webhookId),
    });
  }

  private _handleManageButton(ev: MouseEvent) {
    const entry = (ev.currentTarget as any).parentElement.entry as Webhook;
    this._showDialog(entry.webhook_id);
  }

  private async _enableWebhook(ev: MouseEvent) {
    const entry = (ev.currentTarget as any).parentElement.entry;
    this._progress = [...this._progress, entry.webhook_id];
    let updatedWebhook;

    try {
      updatedWebhook = await createCloudhook(this.hass!, entry.webhook_id);
    } catch (err) {
      alert((err as WebhookError).message);
      return;
    } finally {
      this._progress = this._progress.filter((wid) => wid !== entry.webhook_id);
    }

    this._cloudHooks = {
      ...this._cloudHooks,
      [entry.webhook_id]: updatedWebhook,
    };

    // Only open dialog if we're not also enabling others, otherwise it's confusing
    if (this._progress.length === 0) {
      this._showDialog(entry.webhook_id);
    }
  }

  private async _disableWebhook(webhookId: string) {
    this._progress = [...this._progress, webhookId];
    try {
      await deleteCloudhook(this.hass!, webhookId!);
    } catch (err) {
      alert(
        `${this.hass!.localize(
          "ui.panel.config.cloud.account.webhooks.disable_hook_error_msg"
        )} ${(err as WebhookError).message}`
      );
      return;
    } finally {
      this._progress = this._progress.filter((wid) => wid !== webhookId);
    }

    // Remove cloud related parts from entry.
    const { [webhookId]: disabledHook, ...newHooks } = this._cloudHooks!;
    this._cloudHooks = newHooks;
  }

  private async _fetchData() {
    this._localHooks = this.hass!.config.components.includes("webhook")
      ? await fetchWebhooks(this.hass!)
      : [];
  }

  private renderStyle() {
    return html`
      <style>
        .body-text {
          padding: 8px 0;
        }
        .webhook {
          display: flex;
          padding: 4px 0;
        }
        .progress {
          margin-right: 16px;
          display: flex;
          flex-direction: column;
          justify-content: center;
        }
        .footer {
          padding-top: 16px;
        }
        .body-text a,
        .footer a {
          color: var(--primary-color);
        }
      </style>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "cloud-webhooks": CloudWebhooks;
  }
}

customElements.define("cloud-webhooks", CloudWebhooks);
