import "@polymer/paper-input/paper-input";
import "../../../../../components/ha-icon-button";
import { UnsubscribeFunc } from "home-assistant-js-websocket";
import { mdiContentCopy } from "@mdi/js";
import { css, html, LitElement } from "lit";
import { customElement, property, state } from "lit/decorators";
import type { PaperInputElement } from "@polymer/paper-input/paper-input";
import { fireEvent } from "../../../../../common/dom/fire_event";
import { slugify } from "../../../../../common/string/slugify";
import { copyToClipboard } from "../../../../../common/util/copy-clipboard";
import { showToast } from "../../../../../util/toast";
import {
  WebhookTrigger,
  AutomationConfig,
} from "../../../../../data/automation";
import { HomeAssistant } from "../../../../../types";
import { handleChangeEvent } from "../ha-automation-trigger-row";

const DEFAULT_WEBHOOK_ID = "default webhook id";

@customElement("ha-automation-trigger-webhook")
export class HaWebhookTrigger extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property() public trigger!: WebhookTrigger;

  @state() private _config?: AutomationConfig;

  private _unsub?: UnsubscribeFunc;

  public static get defaultConfig() {
    return {
      webhook_id: DEFAULT_WEBHOOK_ID,
    };
  }

  connectedCallback() {
    super.connectedCallback();
    const details = { callback: (config) => this._automationUpdated(config) };
    fireEvent(this, "subscribe-automation-config", details);
    this._unsub = (details as any).unsub;
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    if (this._unsub) {
      this._unsub();
    }
  }

  private _automationUpdated(config?: AutomationConfig) {
    this._config = config;
  }

  private _generateWebhookId(): string {
    // The webhook_id should be treated like a password. Generate a default
    // value that would be hard for someone to guess. This generates a
    // 144-bit random value. The output is a 24 character url-safe string.
    const randomBytes = crypto.getRandomValues(new Uint8Array(18));
    const base64Str = btoa(String.fromCharCode(...randomBytes));
    const urlSafeId = base64Str.replace(/\+/g, "-").replace(/\//g, "_");

    // Include the automation name to give the user context about what the
    // webhook_id is used for.
    const urlSafeAlias = slugify(this._config?.alias || "", "-");

    return `${urlSafeAlias}-${urlSafeId}`;
  }

  protected render() {
    const { webhook_id: triggerWebhookId } = this.trigger;

    // Generate a random webhookId for new Webhook triggers.
    let webhookId = triggerWebhookId;
    if (webhookId === DEFAULT_WEBHOOK_ID) {
      webhookId = this._generateWebhookId();
      const newTrigger = { ...this.trigger, webhook_id: webhookId };
      fireEvent(this, "value-changed", { value: newTrigger });
    }

    return html`
      <paper-input
        .label=${this.hass.localize(
          "ui.panel.config.automation.editor.triggers.type.webhook.webhook_id"
        )}
        name="webhook_id"
        .value=${webhookId}
        @value-changed=${this._valueChanged}
      >
        <ha-icon-button
          @click=${this._copyUrl}
          slot="suffix"
          .label=${this.hass.localize(
            "ui.panel.config.automation.editor.triggers.type.webhook.copy_url"
          )}
          .path=${mdiContentCopy}
        ></ha-icon-button>
      </paper-input>
      <div class="helper-text">
        ${this.hass.localize(
          "ui.panel.config.automation.editor.triggers.type.webhook.webhook_id_helper"
        )}
      </div>
    `;
  }

  private _valueChanged(ev: CustomEvent): void {
    handleChangeEvent(this, ev);
  }

  private async _copyUrl(ev): Promise<void> {
    const inputElement = ev.target.parentElement as PaperInputElement;
    const url = this.hass.hassUrl(`/api/webhook/${inputElement.value}`);

    await copyToClipboard(url);
    showToast(this, {
      message: this.hass.localize("ui.common.copied_clipboard"),
    });
  }

  static styles = css`
    .helper-text {
      padding-left: 1em;
      color: var(--paper-input-container-color, var(--secondary-text-color));
      font-family: var(--paper-font-caption_-_font-family);
      font-size: var(--paper-font-caption_-_font-size);
      font-weight: var(--paper-font-caption_-_font-weight);
    }
    paper-input > ha-icon-button {
      --mdc-icon-button-size: 24px;
      --mdc-icon-size: 18px;
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-automation-trigger-webhook": HaWebhookTrigger;
  }
}
