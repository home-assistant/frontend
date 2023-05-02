import { css, CSSResultGroup, html, LitElement, nothing } from "lit";
import { customElement, property } from "lit/decorators";
import memoizeOne from "memoize-one";
import { ExtEntityRegistryEntry } from "../../../../data/entity_registry";
import { ExposeEntitySettings, voiceAssistants } from "../../../../data/expose";
import "../../../../panels/config/voice-assistants/entity-voice-settings";
import { HomeAssistant } from "../../../../types";

@customElement("ha-more-info-view-voice-assistants")
class MoreInfoViewVoiceAssistants extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ attribute: false }) public entry!: ExtEntityRegistryEntry;

  @property() public params?;

  private _calculateExposed = memoizeOne((entry: ExtEntityRegistryEntry) => {
    const exposed: ExposeEntitySettings = {};
    Object.keys(voiceAssistants).forEach((key) => {
      exposed[key] = entry.options?.[key]?.should_expose;
    });
    return exposed;
  });

  protected render() {
    if (!this.params) {
      return nothing;
    }
    return html`<entity-voice-settings
      .hass=${this.hass}
      .entityId=${this.entry.entity_id}
      .entry=${this.entry}
      .exposed=${this._calculateExposed(this.entry)}
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
