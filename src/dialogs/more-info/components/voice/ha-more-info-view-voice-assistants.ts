import type { CSSResultGroup, PropertyValues } from "lit";
import { css, html, LitElement, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import type { ExtEntityRegistryEntry } from "../../../../data/entity/entity_registry";
import type { ExposeEntitySettings } from "../../../../data/expose";
import { listExposedEntities } from "../../../../data/expose";
import "../../../../panels/config/voice-assistants/entity-voice-settings";
import type { HomeAssistant } from "../../../../types";

@customElement("ha-more-info-view-voice-assistants")
class MoreInfoViewVoiceAssistants extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ attribute: false }) public entry!: ExtEntityRegistryEntry;

  @property() public params?;

  @state() private _exposed?: ExposeEntitySettings;

  @state() private _locked?: ExposeEntitySettings;

  protected willUpdate(changedProps: PropertyValues<this>) {
    if (changedProps.has("entry") && this.entry) {
      this._fetchExposed();
    }
  }

  private async _fetchExposed() {
    const { exposed_entities, locked_entities } = await listExposedEntities(
      this.hass
    );
    this._exposed = exposed_entities[this.entry.entity_id] ?? {};
    this._locked = locked_entities[this.entry.entity_id];
  }

  protected render() {
    if (!this.params || !this._exposed) {
      return nothing;
    }
    return html`<entity-voice-settings
      .hass=${this.hass}
      .entityId=${this.entry.entity_id}
      .entry=${this.entry}
      .exposed=${this._exposed}
      .locked=${this._locked}
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
          padding: var(--ha-space-6);
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
