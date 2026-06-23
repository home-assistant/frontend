import type { CSSResultGroup, PropertyValues } from "lit";
import { css, html, LitElement, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import { computeStateName } from "../../../common/entity/compute_state_name";
import "../../../components/input/ha-input";
import type { AlexaEntityConfig } from "../../../data/alexa";
import { fetchCloudAlexaEntity } from "../../../data/alexa";
import { updateCloudAlexaEntityConfig } from "../../../data/cloud";
import { haStyle } from "../../../resources/styles";
import type { HomeAssistant } from "../../../types";

@customElement("alexa-entity-voice-settings")
export class AlexaEntityVoiceSettings extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ attribute: false }) public entityId!: string;

  @state() private _entity?: AlexaEntityConfig;

  protected willUpdate(changedProps: PropertyValues<this>) {
    if (changedProps.has("entityId") && this.entityId) {
      this._fetchEntity();
    }
  }

  private async _fetchEntity() {
    try {
      this._entity = await fetchCloudAlexaEntity(this.hass, this.entityId);
    } catch (_err) {
      this._entity = undefined;
    }
  }

  protected render() {
    if (!this._entity) {
      return nothing;
    }

    const defaultName = this.hass.states[this.entityId]
      ? computeStateName(this.hass.states[this.entityId])
      : this.entityId;

    return html`
      <ha-input
        .label=${this.hass.localize("ui.dialogs.voice-settings.name")}
        .hint=${this.hass.localize(
          "ui.dialogs.voice-settings.name_description"
        )}
        with-clear
        .value=${this._entity.name ?? ""}
        .placeholder=${defaultName}
        @change=${this._nameChanged}
      ></ha-input>
    `;
  }

  private async _nameChanged(ev) {
    if (!this._entity) {
      return;
    }
    const value = ev.target.value?.trim() || null;
    if ((this._entity.name ?? null) === value) {
      return;
    }
    const previous = this._entity.name ?? null;
    this._entity = { ...this._entity, name: value };
    try {
      await updateCloudAlexaEntityConfig(this.hass, this.entityId, value);
    } catch (_err) {
      this._entity = { ...this._entity, name: previous };
    }
  }

  static get styles(): CSSResultGroup {
    return [
      haStyle,
      css`
        :host {
          display: block;
          margin: 0 var(--ha-space-8) var(--ha-space-8);
        }
        ha-input {
          display: block;
          width: 100%;
        }
      `,
    ];
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "alexa-entity-voice-settings": AlexaEntityVoiceSettings;
  }
}
