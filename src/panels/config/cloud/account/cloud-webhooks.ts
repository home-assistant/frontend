import { css, CSSResultGroup, html, LitElement, PropertyValues } from "lit";
import { customElement, property, state } from "lit/decorators";
import { isComponentLoaded } from "../../../../common/config/is_component_loaded";
import "../../../../components/ha-card";
import "../../../../components/ha-circular-progress";
import "../../../../components/ha-settings-row";
import "../../../../components/ha-switch";
import {
  CloudStatusLoggedIn,
  CloudWebhook,
  createCloudhook,
  deleteCloudhook,
} from "../../../../data/cloud";
import { fetchWebhooks, Webhook, WebhookError } from "../../../../data/webhook";
import { haStyle } from "../../../../resources/styles";
import { HomeAssistant } from "../../../../types";
import { showManageCloudhookDialog } from "../dialog-manage-cloudhook/show-dialog-manage-cloudhook";

@customElement("cloud-webhooks")
export class CloudWebhooks extends LitElement {
  @property({ attribute: false }) public hass?: HomeAssistant;

  @property({ attribute: false }) public cloudStatus?: CloudStatusLoggedIn;

  @property({ type: Boolean }) public narrow!: boolean;

  @state() private _cloudHooks?: {
    [webhookId: string]: CloudWebhook;
  };

  @state() private _localHooks?: Webhook[];

  @state() private _progress: string[] = [];

  public connectedCallback() {
    super.connectedCallback();
    this._fetchData();
  }

  protected render() {
    return html`
      <ha-card
        outlined
        header=${this.hass!.localize(
          "ui.panel.config.cloud.account.webhooks.title"
        )}
      >
        <div class="card-content">
          ${this.hass!.localize("ui.panel.config.cloud.account.webhooks.info")}
          ${!this.cloudStatus ||
          !this._localHooks ||
          !this._cloudHooks ||
          !this.hass
            ? html`
                <div class="body-text">
                  ${this.hass!.localize(
                    "ui.panel.config.cloud.account.webhooks.loading"
                  )}
                </div>
              `
            : this._localHooks.length === 0
            ? html`
                <div class="body-text">
                  ${this.hass.localize(
                    "ui.panel.config.cloud.account.webhooks.no_hooks_yet"
                  )}
                  <a href="/config/integrations"
                    >${this.hass.localize(
                      "ui.panel.config.cloud.account.webhooks.no_hooks_yet_link_integration"
                    )}
                  </a>
                  ${this.hass.localize(
                    "ui.panel.config.cloud.account.webhooks.no_hooks_yet2"
                  )}
                  <a href="/config/automation/edit/new"
                    >${this.hass.localize(
                      "ui.panel.config.cloud.account.webhooks.no_hooks_yet_link_automation"
                    )}</a
                  >.
                </div>
              `
            : this._localHooks.map(
                (entry) => html`
                  <ha-settings-row .narrow=${this.narrow} .entry=${entry}>
                    <span slot="heading">
                      ${entry.name}
                      ${entry.domain !== entry.name.toLowerCase()
                        ? ` (${entry.domain})`
                        : ""}
                    </span>
                    <span slot="description">${entry.webhook_id}</span>
                    ${this._progress.includes(entry.webhook_id)
                      ? html`
                          <div class="progress">
                            <ha-circular-progress active></ha-circular-progress>
                          </div>
                        `
                      : this._cloudHooks![entry.webhook_id]
                      ? html`
                          <mwc-button @click=${this._handleManageButton}>
                            ${this.hass!.localize(
                              "ui.panel.config.cloud.account.webhooks.manage"
                            )}
                          </mwc-button>
                        `
                      : html`<ha-switch @click=${this._enableWebhook}>
                        </ha-switch>`}
                  </ha-settings-row>
                `
              )}
          <div class="footer">
            <a
              href="https://www.nabucasa.com/config/webhooks"
              target="_blank"
              rel="noreferrer"
            >
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
    const entry = (ev.currentTarget as any).parentElement!.entry as Webhook;
    this._progress = [...this._progress, entry.webhook_id];
    let updatedWebhook;

    try {
      updatedWebhook = await createCloudhook(this.hass!, entry.webhook_id);
    } catch (err: any) {
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
    } catch (err: any) {
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
    if (!isComponentLoaded(this.hass!, "webhook")) {
      this._localHooks = [];
      return;
    }
    const hooks = await fetchWebhooks(this.hass!);
    this._localHooks = hooks.filter(
      (hook) =>
        // Only hooks that are not limited to local requests are relevant
        !hook.local_only &&
        // Deleted webhooks -> nobody cares :)
        (hook.domain !== "mobile_app" || hook.name !== "Deleted Webhook")
    );
  }

  static get styles(): CSSResultGroup {
    return [
      haStyle,
      css`
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
        ha-settings-row {
          padding: 0;
        }
      `,
    ];
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "cloud-webhooks": CloudWebhooks;
  }
}
