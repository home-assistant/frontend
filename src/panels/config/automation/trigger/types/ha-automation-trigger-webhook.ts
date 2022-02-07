import "@polymer/paper-input/paper-input";
import "../../../../../components/ha-icon-button";
import { UnsubscribeFunc } from "home-assistant-js-websocket";
import { mdiContentCopy } from "@mdi/js";
import { css, html, LitElement } from "lit";
import { customElement, property, state } from "lit/decorators";
import type { PaperInputElement } from "@polymer/paper-input/paper-input";
import { fireEvent } from "../../../../../common/dom/fire_event";
import { copyToClipboard } from "../../../../../common/util/copy-clipboard";
import { showToast } from "../../../../../util/toast";
import {
  WebhookTrigger,
  AutomationConfig,
} from "../../../../../data/automation";
import { HomeAssistant } from "../../../../../types";
import { handleChangeEvent } from "../ha-automation-trigger-row";

@customElement("ha-automation-trigger-webhook")
export class HaWebhookTrigger extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property() public trigger!: WebhookTrigger;

  @state() private _config?: AutomationConfig;

  private _unsub?: UnsubscribeFunc;

  public static get defaultConfig() {
    return {
      webhook_id: undefined,
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
    const lowerAlias = this._config?.alias?.toLowerCase() || "";
    const urlSafeAlias = lowerAlias
      .replace(/[^a-z0-9_\s-]/g, "")
      .replace(/[\s-]+/g, "-");

    return `${urlSafeId}-${urlSafeAlias}`;
  }

  protected render() {
    const { webhook_id: triggerWebhookId } = this.trigger;

    // Generate a random webhookId for new Webhook triggers.
    let webhookId = triggerWebhookId;
    if (triggerWebhookId === undefined) {
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
