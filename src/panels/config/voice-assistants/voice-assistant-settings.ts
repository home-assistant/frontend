import { html, LitElement, nothing } from "lit";
import { customElement, property } from "lit/decorators";
import type { ExtEntityRegistryEntry } from "../../../data/entity/entity_registry";
import type { HomeAssistant } from "../../../types";
import "./alexa-entity-voice-settings";
import "./assist-entity-voice-settings";
import "./google-entity-voice-settings";

@customElement("voice-assistant-settings")
export class VoiceAssistantSettings extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ attribute: false }) public entityId!: string;

  @property({ attribute: false }) public assistant!: string;

  @property({ attribute: false }) public entry?: ExtEntityRegistryEntry;

  protected render() {
    switch (this.assistant) {
      case "cloud.google_assistant":
        return html`<google-entity-voice-settings
          .hass=${this.hass}
          .entityId=${this.entityId}
        ></google-entity-voice-settings>`;
      case "cloud.alexa":
        return html`<alexa-entity-voice-settings
          .hass=${this.hass}
          .entityId=${this.entityId}
        ></alexa-entity-voice-settings>`;
      case "conversation":
        return html`<assist-entity-voice-settings
          .hass=${this.hass}
          .entityId=${this.entityId}
          .entry=${this.entry}
        ></assist-entity-voice-settings>`;
      default:
        return nothing;
    }
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "voice-assistant-settings": VoiceAssistantSettings;
  }
}
