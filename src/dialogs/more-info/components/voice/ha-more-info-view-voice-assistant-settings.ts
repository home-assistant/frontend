import { html, LitElement, nothing } from "lit";
import { customElement, property } from "lit/decorators";
import type { ExtEntityRegistryEntry } from "../../../../data/entity/entity_registry";
import "../../../../panels/config/voice-assistants/voice-assistant-settings";
import type { HomeAssistant } from "../../../../types";

@customElement("ha-more-info-view-voice-assistant-settings")
class MoreInfoViewVoiceAssistantSettings extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ attribute: false }) public entry!: ExtEntityRegistryEntry;

  @property({ attribute: false }) public params?: { assistant: string };

  protected render() {
    if (!this.params || !this.entry) {
      return nothing;
    }

    return html`<voice-assistant-settings
      .hass=${this.hass}
      .entityId=${this.entry.entity_id}
      .assistant=${this.params.assistant}
      .entry=${this.entry}
    ></voice-assistant-settings>`;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-more-info-view-voice-assistant-settings": MoreInfoViewVoiceAssistantSettings;
  }
}
