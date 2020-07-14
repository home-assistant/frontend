import "@polymer/paper-input/paper-input";
import { customElement, html, LitElement, property } from "lit-element";
import { WebhookTrigger } from "../../../../../data/automation";
import { HomeAssistant } from "../../../../../types";
import { handleChangeEvent } from "../ha-automation-trigger-row";

@customElement("ha-automation-trigger-webhook")
export class HaWebhookTrigger extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property() public trigger!: WebhookTrigger;

  public static get defaultConfig() {
    return {
      webhook_id: "",
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
        .value=${webhookId}
        @value-changed=${this._valueChanged}
      ></paper-input>
    `;
  }

  private _valueChanged(ev: CustomEvent): void {
    handleChangeEvent(this, ev);
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-automation-trigger-webhook": HaWebhookTrigger;
  }
}
