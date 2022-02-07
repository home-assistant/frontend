import "@polymer/paper-input/paper-input";
import "../../../../../components/ha-icon-button";
import { mdiContentCopy } from "@mdi/js";
import { css, html, LitElement } from "lit";
import { customElement, property } from "lit/decorators";
import type { PaperInputElement } from "@polymer/paper-input/paper-input";
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
    const randomBytes = crypto.getRandomValues(new Uint8Array(18));
    const base64Str = btoa(String.fromCharCode(...randomBytes));
    const urlSafeId = base64Str.replace(/\+/g, "-").replace(/\//g, "_");

    return {
      webhook_id: urlSafeId,
    };
  }

  protected render() {
    const { webhook_id: webhookId } = this.trigger;
    return html`
      <paper-input
        .label=${this.hass.localize(
          "ui.panel.config.automation.editor.triggers.type.webhook.webhook_id"
        )}
        id="webhook_id"
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

  private async _copyUrl(): Promise<void> {
    const inputElement = this.shadowRoot?.querySelector(
      "#webhook_id"
    ) as PaperInputElement;
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
