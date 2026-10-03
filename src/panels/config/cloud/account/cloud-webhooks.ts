import type { CSSResultGroup, PropertyValues } from "lit";
import { css, html, LitElement, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import { isComponentLoaded } from "../../../../common/config/is_component_loaded";
import { fireEvent } from "../../../../common/dom/fire_event";
import "../../../../components/ha-button";
import "../../../../components/ha-card";
import "../../../../components/ha-spinner";
import "../../../../components/ha-switch";
import "../../../../components/item/ha-row-item";
import type { CloudStatusLoggedIn, CloudWebhook } from "../../../../data/cloud";
import { createCloudhook, deleteCloudhook } from "../../../../data/cloud";
import type { Webhook, WebhookError } from "../../../../data/webhook";
import { fetchWebhooks, isActiveCloudWebhook } from "../../../../data/webhook";
import "../../../../layouts/hass-subpage";
import { haStyle } from "../../../../resources/styles";
import type { HomeAssistant } from "../../../../types";
import { showManageCloudhookDialog } from "../dialog-manage-cloudhook/show-dialog-manage-cloudhook";
import { cloudSubpageStyle } from "./cloud-subpage-style";

@customElement("cloud-webhooks")
export class CloudWebhooks extends LitElement {
  @property({ attribute: false }) public hass?: HomeAssistant;

  @property({ type: Boolean }) public narrow = false;

  @property({ attribute: false }) public cloudStatus?: CloudStatusLoggedIn;

  @state() private _cloudHooks?: Record<string, CloudWebhook>;

  @state() private _customHooks?: Webhook[];

  @state() private _mobileHooks?: Webhook[];

  @state() private _progress: string[] = [];

  public connectedCallback() {
    super.connectedCallback();
    this._fetchData();
  }

  protected render() {
    return html`
      <hass-subpage
        .hass=${this.hass}
        .narrow=${this.narrow}
        .header=${this.hass!.localize(
          "ui.panel.config.cloud.account.webhooks.title"
        )}
        back-path="/config/cloud/account"
      >
        <div class="content">
          <ha-card
            outlined
            header=${this.hass!.localize(
              "ui.panel.config.cloud.account.webhooks.title"
            )}
          >
            <div class="card-content">
              <p>
                ${this.hass!.localize(
                  "ui.panel.config.cloud.account.webhooks.info"
                )}
              </p>
              ${
                !this.cloudStatus ||
                !this._customHooks ||
                !this._mobileHooks ||
                !this._cloudHooks ||
                !this.hass
                  ? html`
                      <div class="body-text">
                        ${this.hass!.localize(
                          "ui.panel.config.cloud.account.webhooks.loading"
                        )}
                      </div>
                    `
                  : this._customHooks.length === 0 && !this._mobileHooks.length
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
                    : this._customHooks.map((entry) =>
                        this._renderHookRow(entry)
                      )
              }
            </div>
            <div class="card-actions">
              <ha-button
                appearance="plain"
                href="https://www.nabucasa.com/config/webhooks"
                target="_blank"
                rel="noreferrer"
              >
                ${this.hass!.localize(
                  "ui.panel.config.cloud.account.webhooks.link_learn_more"
                )}
              </ha-button>
            </div>
          </ha-card>

          ${
            this._mobileHooks && this._mobileHooks.length
              ? html`
                  <ha-card
                    outlined
                    header=${this.hass!.localize(
                      "ui.panel.config.cloud.account.webhooks.companion_title"
                    )}
                  >
                    <div class="card-content">
                      <p>
                        ${this.hass!.localize(
                          "ui.panel.config.cloud.account.webhooks.companion_info"
                        )}
                      </p>
                      ${this._mobileHooks.map((entry) =>
                        this._renderHookRow(entry)
                      )}
                    </div>
                  </ha-card>
                `
              : nothing
          }

          <ha-card
            outlined
            header=${this.hass!.localize(
              "ui.panel.config.cloud.account.webhooks.about_title"
            )}
          >
            <div class="card-content">
              <p>
                ${this.hass!.localize(
                  "ui.panel.config.cloud.account.webhooks.about_info"
                )}
              </p>
              <ul class="examples">
                <li>
                  ${this.hass!.localize(
                    "ui.panel.config.cloud.account.webhooks.example_camera"
                  )}
                </li>
                <li>
                  ${this.hass!.localize(
                    "ui.panel.config.cloud.account.webhooks.example_location"
                  )}
                </li>
                <li>
                  ${this.hass!.localize(
                    "ui.panel.config.cloud.account.webhooks.example_ifttt"
                  )}
                </li>
                <li>
                  ${this.hass!.localize(
                    "ui.panel.config.cloud.account.webhooks.example_nfc"
                  )}
                </li>
                <li>
                  ${this.hass!.localize(
                    "ui.panel.config.cloud.account.webhooks.example_sms"
                  )}
                </li>
              </ul>
              <p class="note">
                ${this.hass!.localize(
                  "ui.panel.config.cloud.account.webhooks.about_note"
                )}
              </p>
            </div>
          </ha-card>
        </div>
      </hass-subpage>
    `;
  }

  protected updated(changedProps: PropertyValues<this>) {
    super.updated(changedProps);
    if (changedProps.has("cloudStatus") && this.cloudStatus) {
      this._cloudHooks = this.cloudStatus.prefs.cloudhooks || {};
    }
  }

  private _renderHookRow(entry: Webhook) {
    return html`
      <ha-row-item>
        <span slot="headline"
          >${entry.name}
          ${
            entry.domain !== entry.name.toLowerCase()
              ? ` (${entry.domain})`
              : ""
          }</span
        >
        <span slot="supporting-text">${entry.webhook_id}</span>
        ${
          this._progress.includes(entry.webhook_id)
            ? html`
                <div class="progress" slot="end">
                  <ha-spinner></ha-spinner>
                </div>
              `
            : this._cloudHooks?.[entry.webhook_id]
              ? html`
                  <ha-button
                    slot="end"
                    appearance="plain"
                    size="s"
                    data-webhook-id=${entry.webhook_id}
                    @click=${this._handleManageButton}
                  >
                    ${this.hass!.localize(
                      "ui.panel.config.cloud.account.webhooks.manage"
                    )}
                  </ha-button>
                `
              : html`
                  <ha-switch
                    slot="end"
                    data-webhook-id=${entry.webhook_id}
                    @click=${this._enableWebhook}
                  ></ha-switch>
                `
        }
      </ha-row-item>
    `;
  }

  private _showDialog(webhookId: string) {
    const webhook = [
      ...(this._customHooks ?? []),
      ...(this._mobileHooks ?? []),
    ].find((ent) => ent.webhook_id === webhookId);
    if (!webhook) {
      return;
    }
    const cloudhook = this._cloudHooks![webhookId];
    showManageCloudhookDialog(this, {
      webhook,
      cloudhook,
      disableHook: () => this._disableWebhook(webhookId),
    });
  }

  private _handleManageButton(ev: Event) {
    const webhookId = (ev.currentTarget as HTMLElement).dataset.webhookId!;
    this._showDialog(webhookId);
  }

  private async _enableWebhook(ev: Event) {
    const webhookId = (ev.currentTarget as HTMLElement).dataset.webhookId!;
    if (this._progress.includes(webhookId)) {
      return;
    }
    this._progress = [...this._progress, webhookId];
    let updatedWebhook;

    try {
      updatedWebhook = await createCloudhook(this.hass!, webhookId);
    } catch (err: any) {
      alert((err as WebhookError).message);
      return;
    } finally {
      this._progress = this._progress.filter((wid) => wid !== webhookId);
    }

    this._cloudHooks = {
      ...this._cloudHooks,
      [webhookId]: updatedWebhook,
    };

    // Refresh the shared cloud status so the account overview's active-webhook
    // count reflects the new cloudhook (it reads cloudStatus.prefs.cloudhooks).
    fireEvent(this, "ha-refresh-cloud-status");

    // Only open dialog if we're not also enabling others, otherwise it's confusing
    if (this._progress.length === 0) {
      this._showDialog(webhookId);
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

    // Keep the shared cloud status (and the overview's active-webhook count) in
    // sync now that this cloudhook is gone.
    fireEvent(this, "ha-refresh-cloud-status");
  }

  private async _fetchData() {
    if (!isComponentLoaded(this.hass!.config, "webhook")) {
      this._customHooks = [];
      this._mobileHooks = [];
      return;
    }
    const hooks = await fetchWebhooks(this.hass!);
    const relevant = hooks.filter(isActiveCloudWebhook);

    // Mobile app webhooks are created automatically and shown in their own card.
    this._customHooks = relevant.filter((hook) => hook.domain !== "mobile_app");
    this._mobileHooks = relevant.filter((hook) => hook.domain === "mobile_app");
  }

  static get styles(): CSSResultGroup {
    return [
      haStyle,
      cloudSubpageStyle,
      css`
        .card-content p {
          color: var(--secondary-text-color);
        }
        .body-text {
          padding: var(--ha-space-2) 0;
        }
        .body-text a {
          color: var(--primary-color);
        }
        .examples {
          color: var(--secondary-text-color);
          padding-inline-start: var(--ha-space-5);
        }
        .examples li {
          margin-bottom: var(--ha-space-1);
        }
        .note {
          font-size: var(--ha-font-size-s);
        }
        .progress {
          margin-right: var(--ha-space-4);
          margin-inline-end: var(--ha-space-4);
          margin-inline-start: initial;
          display: flex;
          flex-direction: column;
          justify-content: center;
        }
        .card-actions {
          display: flex;
          justify-content: flex-end;
        }
        ha-row-item {
          --ha-row-item-padding-inline: 0;
        }
        ha-row-item::part(headline),
        ha-row-item::part(supporting-text) {
          white-space: wrap;
          word-break: break-all;
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
