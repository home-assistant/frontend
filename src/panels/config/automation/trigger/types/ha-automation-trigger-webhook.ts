import "../../../../../components/ha-icon-button";
import "../../../../../components/ha-textfield";
import { UnsubscribeFunc } from "home-assistant-js-websocket";
import { mdiContentCopy } from "@mdi/js";
import { css, html, LitElement, PropertyValues } from "lit";
import { customElement, property, state } from "lit/decorators";
import { fireEvent } from "../../../../../common/dom/fire_event";
import { slugify } from "../../../../../common/string/slugify";
import { copyToClipboard } from "../../../../../common/util/copy-clipboard";
import type { HaTextField } from "../../../../../components/ha-textfield";
import { showToast } from "../../../../../util/toast";
import {
  WebhookTrigger,
  AutomationConfig,
} from "../../../../../data/automation";
import { HomeAssistant } from "../../../../../types";
import { handleChangeEvent } from "../ha-automation-trigger-row";

const DEFAULT_WEBHOOK_ID = "";

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
    const details = {
      callback: (config) => {
        this._config = config;
      },
    };
    fireEvent(this, "subscribe-automation-config", details);
    this._unsub = (details as any).unsub;
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    if (this._unsub) {
      this._unsub();
    }
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

  public willUpdate(changedProperties: PropertyValues) {
    super.willUpdate(changedProperties);
    if (changedProperties.has("trigger")) {
      if (this.trigger.webhook_id === DEFAULT_WEBHOOK_ID) {
        this.trigger.webhook_id = this._generateWebhookId();
      }
    }
  }

  protected render() {
    const { webhook_id: webhookId } = this.trigger;

    return html`
      <ha-textfield
        name="webhook_id"
        .label=${this.hass.localize(
          "ui.panel.config.automation.editor.triggers.type.webhook.webhook_id"
        )}
        .helper=${this.hass.localize(
          "ui.panel.config.automation.editor.triggers.type.webhook.webhook_id_helper"
        )}
        iconTrailing
        .value=${webhookId || ""}
        @input=${this._valueChanged}
      >
        <ha-icon-button
          @click=${this._copyUrl}
          slot="trailingIcon"
          .label=${this.hass.localize(
            "ui.panel.config.automation.editor.triggers.type.webhook.copy_url"
          )}
          .path=${mdiContentCopy}
        ></ha-icon-button>
      </ha-textfield>
    `;
  }

  private _valueChanged(ev: CustomEvent): void {
    handleChangeEvent(this, ev);
  }

  private async _copyUrl(ev): Promise<void> {
    const inputElement = ev.target.parentElement as HaTextField;
    const url = this.hass.hassUrl(`/api/webhook/${inputElement.value}`);

    await copyToClipboard(url);
    showToast(this, {
      message: this.hass.localize("ui.common.copied_clipboard"),
    });
  }

  static styles = css`
    ha-textfield {
      display: block;
    }

    ha-textfield > ha-icon-button {
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
