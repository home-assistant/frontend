import type { CSSResultGroup, PropertyValues } from "lit";
import { css, html, LitElement, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import "../../../../components/ha-alert";
import "../../../../components/ha-button";
import "../../../../components/ha-spinner";
import type { ExtEntityRegistryEntry } from "../../../../data/entity/entity_registry";
import type { ExposeEntitySettings } from "../../../../data/expose";
import { listExposedEntities } from "../../../../data/expose";
import "../../../../panels/config/voice-assistants/entity-voice-settings";
import type { HomeAssistant } from "../../../../types";

@customElement("ha-more-info-view-voice-assistants")
export class MoreInfoViewVoiceAssistants extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ attribute: false }) public entry!: ExtEntityRegistryEntry;

  @property() public params?;

  @state() private _exposed?: ExposeEntitySettings;

  @state() private _locked?: ExposeEntitySettings;

  @state() private _error = false;

  private _fetchGeneration = 0;

  protected willUpdate(changedProps: PropertyValues<this>) {
    if (changedProps.has("entry") && this.entry) {
      this._exposed = undefined;
      this._locked = undefined;
      this._fetchExposed();
    }
  }

  private _fetchExposed = async () => {
    const generation = ++this._fetchGeneration;
    this._error = false;
    try {
      const { exposed_entities, locked_entities } = await listExposedEntities(
        this.hass
      );
      if (generation !== this._fetchGeneration) {
        // A newer request has since been issued; let it win instead.
        return;
      }
      const entityId = this.entry.entity_id;
      this._exposed = exposed_entities[entityId] ?? {};
      this._locked = locked_entities[entityId];
    } catch (_err) {
      if (generation !== this._fetchGeneration) {
        return;
      }
      this._error = true;
    }
  };

  protected render() {
    if (!this.params) {
      return nothing;
    }
    if (this._error) {
      return html`
        <ha-alert alert-type="error">
          ${this.hass.localize("ui.dialogs.voice-settings.load_error")}
          <ha-button slot="action" @click=${this._fetchExposed}>
            ${this.hass.localize("ui.dialogs.voice-settings.retry")}
          </ha-button>
        </ha-alert>
      `;
    }
    if (!this._exposed) {
      return html`<ha-spinner active></ha-spinner>`;
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
        ha-spinner {
          margin: var(--ha-space-8) auto;
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
