import type { CSSResultGroup } from "lit";
import { css, html, LitElement } from "lit";
import { customElement, property, state } from "lit/decorators";
import { fireEvent } from "../../../common/dom/fire_event";
import { computeStateName } from "../../../common/entity/compute_state_name";
import "../../../components/ha-alert";
import "../../../components/ha-aliases-editor";
import "../../../components/ha-md-list-item";
import "../../../components/ha-switch";
import type { ExtEntityRegistryEntry } from "../../../data/entity/entity_registry";
import { updateEntityRegistryEntry } from "../../../data/entity/entity_registry";
import { haStyle } from "../../../resources/styles";
import type { HomeAssistant } from "../../../types";
import { documentationUrl } from "../../../util/documentation-url";

@customElement("assist-entity-voice-settings")
export class AssistEntityVoiceSettings extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ attribute: false }) public entityId!: string;

  @property({ attribute: false }) public entry?: ExtEntityRegistryEntry;

  @state() private _aliases?: (string | null)[];

  protected render() {
    if (!this.entry) {
      return html`<ha-alert alert-type="warning">
        ${this.hass.localize("ui.dialogs.voice-settings.aliases_no_unique_id", {
          faq_link: html`<a
            href=${documentationUrl(this.hass, "/faq/unique_id")}
            target="_blank"
            rel="noreferrer"
            >${this.hass.localize("ui.dialogs.entity_registry.faq")}</a
          >`,
        })}
      </ha-alert>`;
    }

    return html`
      <ha-md-list-item>
        <span slot="headline">
          ${this.hass.states[this.entityId]
            ? computeStateName(this.hass.states[this.entityId])
            : this.entityId}
        </span>
        <span slot="supporting-text">
          ${this.hass.localize(
            "ui.dialogs.voice-settings.entity_name_alias_description"
          )}
        </span>
        <ha-switch
          slot="end"
          .checked=${(this._aliases ?? this.entry.aliases).includes(null)}
          @change=${this._toggleEntityNameAlias}
        ></ha-switch>
      </ha-md-list-item>
      <h4 class="header">
        ${this.hass.localize("ui.dialogs.voice-settings.aliases")}
      </h4>
      <ha-aliases-editor
        .aliases=${(this._aliases ?? this.entry.aliases).filter(
          (a): a is string => a !== null
        )}
        sortable
        @value-changed=${this._aliasesChanged}
      ></ha-aliases-editor>
    `;
  }

  private async _toggleEntityNameAlias(ev) {
    const previous = this._aliases;
    const enabled = ev.target.checked;
    const currentAliases = this._aliases ?? this.entry?.aliases ?? [];
    if (enabled) {
      this._aliases = [null, ...currentAliases.filter((a) => a !== null)];
    } else {
      this._aliases = currentAliases.filter((a): a is string => a !== null);
    }
    await this._saveAliases(previous);
  }

  private _aliasesChanged(ev) {
    const previous = this._aliases;
    const currentAliases = this._aliases ?? this.entry?.aliases ?? [];
    const hasNull = currentAliases.includes(null);
    const nullAliases: (string | null)[] = hasNull ? [null] : [];
    const newStringAliases: string[] = ev.detail.value;

    this._aliases = [...nullAliases, ...newStringAliases];
    this._saveAliases(previous);
  }

  private async _saveAliases(previous?: (string | null)[]) {
    if (!this._aliases) {
      return;
    }
    const hasNull = this._aliases.includes(null);
    const nullAliases: null[] = hasNull ? [null] : [];
    const stringAliases = this._aliases
      .filter((a): a is string => a !== null)
      .map((alias) => alias.trim())
      .filter((alias) => alias);
    try {
      const result = await updateEntityRegistryEntry(this.hass, this.entityId, {
        aliases: [...nullAliases, ...stringAliases],
      });
      fireEvent(this, "entity-entry-updated", result.entity_entry);
    } catch (_err) {
      this._aliases = previous;
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
        ha-md-list-item {
          --md-list-item-leading-space: 0;
          --md-list-item-trailing-space: 0;
          --md-item-overflow: visible;
        }
        ha-aliases-editor {
          display: block;
        }
        .header {
          margin-top: var(--ha-space-2);
          margin-bottom: var(--ha-space-1);
        }
      `,
    ];
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "assist-entity-voice-settings": AssistEntityVoiceSettings;
  }
  interface HASSDomEvents {
    "entity-entry-updated": ExtEntityRegistryEntry;
  }
}
