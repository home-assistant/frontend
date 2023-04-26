import { css, CSSResultGroup, html, LitElement, nothing } from "lit";
import { customElement, property } from "lit/decorators";
import { ExtEntityRegistryEntry } from "../../../../data/entity_registry";
import "../../../../panels/config/voice-assistants/entity-voice-settings";
import { HomeAssistant } from "../../../../types";

@customElement("ha-more-info-view-voice-assistants")
class MoreInfoViewVoiceAssistants extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ attribute: false }) public entry!: ExtEntityRegistryEntry;

  @property() public params?;

  protected render() {
    if (!this.params) {
      return nothing;
    }
    return html`<entity-voice-settings
      .hass=${this.hass}
      .entry=${this.entry}
    ></entity-voice-settings>`;
  }

  static get styles(): CSSResultGroup {
    return [
      css`
        :host {
          display: flex;
          flex-direction: column;
        }
        .content {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 24px;
          flex: 1;
        }
      `,
    ];
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-more-info-view-voice-assistants": MoreInfoViewVoiceAssistants;
  }
}
