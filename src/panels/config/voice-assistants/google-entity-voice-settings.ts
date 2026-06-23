import "@home-assistant/webawesome/dist/components/divider/divider";
import type { CSSResultGroup, PropertyValues } from "lit";
import { css, html, LitElement, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import { computeStateName } from "../../../common/entity/compute_state_name";
import "../../../components/ha-aliases-editor";
import "../../../components/ha-md-list-item";
import "../../../components/ha-switch";
import "../../../components/input/ha-input";
import { updateCloudGoogleEntityConfig } from "../../../data/cloud";
import type { GoogleEntity } from "../../../data/google_assistant";
import { fetchCloudGoogleEntity } from "../../../data/google_assistant";
import { haStyle } from "../../../resources/styles";
import type { HomeAssistant } from "../../../types";

@customElement("google-entity-voice-settings")
export class GoogleEntityVoiceSettings extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ attribute: false }) public entityId!: string;

  @state() private _entity?: GoogleEntity;

  protected willUpdate(changedProps: PropertyValues<this>) {
    if (changedProps.has("entityId") && this.entityId) {
      this._fetchEntity();
    }
  }

  private async _fetchEntity() {
    try {
      const entity = await fetchCloudGoogleEntity(this.hass, this.entityId);
      if (entity.aliases) {
        entity.aliases = entity.aliases.filter(Boolean);
      }
      this._entity = entity;
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
      <h4 class="header">
        ${this.hass.localize("ui.dialogs.voice-settings.aliases")}
      </h4>
      <ha-aliases-editor
        .aliases=${this._entity.aliases ?? []}
        @value-changed=${this._aliasesChanged}
      ></ha-aliases-editor>
      ${this._entity.might_2fa
        ? html`
            <wa-divider></wa-divider>
            <ha-md-list-item>
              <span slot="headline">
                ${this.hass.localize("ui.dialogs.voice-settings.ask_pin")}
              </span>
              <ha-switch
                slot="end"
                .checked=${!this._entity.disable_2fa}
                @change=${this._2faChanged}
              ></ha-switch>
            </ha-md-list-item>
          `
        : nothing}
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
      await updateCloudGoogleEntityConfig(this.hass, this.entityId, {
        name: value,
      });
    } catch (_err) {
      this._entity = { ...this._entity, name: previous };
    }
  }

  private async _aliasesChanged(ev) {
    if (!this._entity) {
      return;
    }
    const aliases = ev.detail.value as string[];
    const previous = this._entity.aliases ?? null;
    this._entity = { ...this._entity, aliases };
    const stringAliases = aliases
      .map((alias) => alias.trim())
      .filter((alias) => alias);
    try {
      await updateCloudGoogleEntityConfig(this.hass, this.entityId, {
        aliases: stringAliases,
      });
    } catch (_err) {
      this._entity = { ...this._entity, aliases: previous };
    }
  }

  private async _2faChanged(ev) {
    if (!this._entity) {
      return;
    }
    const disable_2fa = !ev.target.checked;
    this._entity = { ...this._entity, disable_2fa };
    try {
      await updateCloudGoogleEntityConfig(this.hass, this.entityId, {
        disable_2fa,
      });
    } catch (_err) {
      this._entity = { ...this._entity, disable_2fa: !disable_2fa };
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
        ha-aliases-editor {
          display: block;
        }
        .header {
          margin-top: var(--ha-space-2);
          margin-bottom: var(--ha-space-1);
        }
        ha-md-list-item {
          --md-list-item-leading-space: 0;
          --md-list-item-trailing-space: 0;
          --md-item-overflow: visible;
        }
        wa-divider {
          margin: var(--ha-space-2) 0;
        }
      `,
    ];
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "google-entity-voice-settings": GoogleEntityVoiceSettings;
  }
}
