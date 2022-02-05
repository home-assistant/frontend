import "../../../../../components/ha-icon-button";
import { mdiContentCopy } from "@mdi/js";
import { html, LitElement } from "lit";
import { customElement, property } from "lit/decorators";
import { PaperInputElement } from "@polymer/paper-input/paper-input";
import { copyToClipboard } from "../../../../../common/util/copy-clipboard";
import { showToast } from "../../../../../util/toast";
import { WebhookTrigger } from "../../../../../data/automation";
import { HomeAssistant } from "../../../../../types";
import { handleChangeEvent } from "../ha-automation-trigger-row";

@customElement("ha-automation-trigger-webhook")
export class HaWebhookTrigger extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property() public trigger!: WebhookTrigger;

  public static get defaultConfig() {
    // The webhook_id should be treated like a password. Generate a default
    // value that would be hard for someone to guess. This generates a
    // 144-bit random value. The output is a 24 character url-safe string.
    const random_bytes = crypto.getRandomValues(new Uint8Array(18));
    const base64_str = btoa(String.fromCharCode(...random_bytes));
    const url_safe_id = base64_str.replace(/\+/g, "-").replace(/\//g, "_");

    return {
      webhook_id: url_safe_id,
    };
  }

  protected render() {
    const { webhook_id: webhookId } = this.trigger;
    return html`
      <paper-input
        .label=${this.hass.localize(
          "ui.panel.config.automation.editor.triggers.type.webhook.webhook_id"
        )}
        name="webhook_id"
        id="webhook_id"
        .value=${webhookId}
        @value-changed=${this._valueChanged}
      ></paper-input>
      <ha-icon-button
        id="copy"
        @click=${this._copyId}
        slot="actionItems"
        .label=${this.hass.localize(
          "ui.panel.config.automation.editor.copy_to_clipboard"
        )}
        .path=${mdiContentCopy}
      ></ha-icon-button>
    `;
  }

  private _valueChanged(ev: CustomEvent): void {
    handleChangeEvent(this, ev);
  }

  private async _copyId(): Promise<void> {
    const inputElement = this.shadowRoot?.querySelector(
      "#webhook_id"
    ) as PaperInputElement;

    await copyToClipboard(inputElement.value);
    showToast(this, {
      message: this.hass.localize("ui.common.copied_clipboard"),
    });
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-automation-trigger-webhook": HaWebhookTrigger;
  }
}
