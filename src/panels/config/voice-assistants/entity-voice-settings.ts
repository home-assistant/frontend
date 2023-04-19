import {
  css,
  CSSResultGroup,
  html,
  LitElement,
  nothing,
  PropertyValues,
} from "lit";
import { customElement, property, state } from "lit/decorators";
import memoizeOne from "memoize-one";
import { isComponentLoaded } from "../../../common/config/is_component_loaded";
import { fireEvent } from "../../../common/dom/fire_event";
import {
  EntityFilter,
  FilterFunc,
  generateFilter,
  isEmptyFilter,
} from "../../../common/entity/entity_filter";
import "../../../components/ha-aliases-editor";
import "../../../components/ha-settings-row";
import "../../../components/ha-switch";
import {
  CloudStatus,
  CloudStatusLoggedIn,
  fetchCloudStatus,
  updateCloudGoogleEntityConfig,
} from "../../../data/cloud";
import {
  ExtEntityRegistryEntry,
  getExtendedEntityRegistryEntry,
  updateEntityRegistryEntry,
} from "../../../data/entity_registry";
import {
  GoogleEntity,
  fetchCloudGoogleEntity,
} from "../../../data/google_assistant";
import {
  exposeEntities,
  voiceAssistantKeys,
  voiceAssistants,
} from "../../../data/voice";
import { SubscribeMixin } from "../../../mixins/subscribe-mixin";
import { haStyle } from "../../../resources/styles";
import type { HomeAssistant } from "../../../types";
import { brandsUrl } from "../../../util/brands-url";
import { EntityRegistrySettings } from "../entities/entity-registry-settings";

@customElement("entity-voice-settings")
export class EntityVoiceSettings extends SubscribeMixin(LitElement) {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ type: Object }) public entry!: ExtEntityRegistryEntry;

  @state() private _cloudStatus?: CloudStatus;

  @state() private _aliases?: string[];

  @state() private _googleEntity?: GoogleEntity;

  protected willUpdate(changedProps: PropertyValues<this>) {
    if (!isComponentLoaded(this.hass, "cloud")) {
      return;
    }
    if (changedProps.has("entry") && this.entry) {
      fetchCloudGoogleEntity(this.hass, this.entry.entity_id).then(
        (googleEntity) => {
          this._googleEntity = googleEntity;
        }
      );
    }
    if (!this.hasUpdated) {
      fetchCloudStatus(this.hass).then((status) => {
        this._cloudStatus = status;
      });
    }
  }

  private _getEntityFilterFuncs = memoizeOne(
    (googleFilter: EntityFilter, alexaFilter: EntityFilter) => ({
      google: generateFilter(
        googleFilter.include_domains,
        googleFilter.include_entities,
        googleFilter.exclude_domains,
        googleFilter.exclude_entities
      ),
      alexa: generateFilter(
        alexaFilter.include_domains,
        alexaFilter.include_entities,
        alexaFilter.exclude_domains,
        alexaFilter.exclude_entities
      ),
    })
  );

  protected render() {
    const googleEnabled =
      this._cloudStatus?.logged_in === true &&
      this._cloudStatus.prefs.google_enabled === true;

    const alexaEnabled =
      this._cloudStatus?.logged_in === true &&
      this._cloudStatus.prefs.alexa_enabled === true;

    const showAssistants = [...voiceAssistantKeys];
    const uiAssistants = [...voiceAssistantKeys];

    const alexaManual =
      alexaEnabled &&
      !isEmptyFilter((this._cloudStatus as CloudStatusLoggedIn).alexa_entities);
    const googleManual =
      googleEnabled &&
      !isEmptyFilter(
        (this._cloudStatus as CloudStatusLoggedIn).google_entities
      );

    if (!googleEnabled) {
      showAssistants.splice(
        showAssistants.indexOf("cloud.google_assistant"),
        1
      );
      uiAssistants.splice(showAssistants.indexOf("cloud.google_assistant"), 1);
    } else if (googleManual) {
      uiAssistants.splice(uiAssistants.indexOf("cloud.google_assistant"), 1);
    }

    if (!alexaEnabled) {
      showAssistants.splice(showAssistants.indexOf("cloud.alexa"), 1);
      uiAssistants.splice(uiAssistants.indexOf("cloud.alexa"), 1);
    } else if (alexaManual) {
      uiAssistants.splice(uiAssistants.indexOf("cloud.alexa"), 1);
    }

    const uiExposed = uiAssistants.some(
      (key) => this.entry.options?.[key]?.should_expose
    );

    let manFilterFuncs:
      | {
          google: FilterFunc;
          alexa: FilterFunc;
        }
      | undefined;

    if (alexaManual || googleManual) {
      manFilterFuncs = this._getEntityFilterFuncs(
        (this._cloudStatus as CloudStatusLoggedIn).google_entities,
        (this._cloudStatus as CloudStatusLoggedIn).alexa_entities
      );
    }

    const manExposedAlexa =
      alexaManual && manFilterFuncs!.alexa(this.entry.entity_id);
    const manExposedGoogle =
      googleManual && manFilterFuncs!.google(this.entry.entity_id);

    const anyExposed = uiExposed || manExposedAlexa || manExposedGoogle;

    return html`
      <ha-settings-row>
        <h3 slot="heading">
          ${this.hass.localize("ui.dialogs.voice-settings.expose_header")}
        </h3>
        <ha-switch
          @change=${this._toggleAll}
          .checked=${anyExposed}
        ></ha-switch>
      </ha-settings-row>
      ${anyExposed
        ? showAssistants.map(
            (key) => html`
              <ha-settings-row>
                <img
                  alt=""
                  src=${brandsUrl({
                    domain: voiceAssistants[key].domain,
                    type: "icon",
                    darkOptimized: this.hass.themes?.darkMode,
                  })}
                  referrerpolicy="no-referrer"
                  slot="prefix"
                />
                <span slot="heading">${voiceAssistants[key].name}</span>
                ${key === "cloud.google_assistant" &&
                !googleManual &&
                this._googleEntity?.might_2fa
                  ? html`
                      <ha-formfield
                        slot="description"
                        .label=${this.hass.localize(
                          "ui.dialogs.voice-settings.ask_pin"
                        )}
                      >
                        <ha-checkbox
                          .checked=${!this.entry.options?.[key]?.disable_2fa}
                          @change=${this._2faChanged}
                        ></ha-checkbox>
                      </ha-formfield>
                    `
                  : (alexaManual && key === "cloud.alexa") ||
                    (googleManual && key === "cloud.google_assistant")
                  ? html`
                      <span slot="description">
                        ${this.hass.localize(
                          "ui.dialogs.voice-settings.manual_config"
                        )}
                      </span>
                    `
                  : nothing}
                <ha-switch
                  .assistant=${key}
                  @change=${this._toggleAssistant}
                  .disabled=${(alexaManual && key === "cloud.alexa") ||
                  (googleManual && key === "cloud.google_assistant")}
                  .checked=${alexaManual && key === "cloud.alexa"
                    ? manExposedAlexa
                    : googleManual && key === "cloud.google_assistant"
                    ? manExposedGoogle
                    : this.entry.options?.[key]?.should_expose}
                ></ha-switch>
              </ha-settings-row>
            `
          )
        : nothing}

      <h3 class="header">
        ${this.hass.localize("ui.dialogs.voice-settings.aliases_header")}
      </h3>

      <p class="description">
        ${this.hass.localize("ui.dialogs.voice-settings.aliases_description")}
      </p>

      <ha-aliases-editor
        .hass=${this.hass}
        .aliases=${this._aliases ?? this.entry.aliases}
        @value-changed=${this._aliasesChanged}
        @blur=${this._saveAliases}
      ></ha-aliases-editor>
    `;
  }

  private _aliasesChanged(ev) {
    this._aliases = ev.detail.value;
  }

  private async _2faChanged(ev) {
    try {
      await updateCloudGoogleEntityConfig(
        this.hass,
        this.entry.entity_id,
        !ev.target.checked
      );
    } catch (_err) {
      ev.target.checked = !ev.target.checked;
    }
  }

  private async _saveAliases() {
    if (!this._aliases) {
      return;
    }
    const result = await updateEntityRegistryEntry(
      this.hass,
      this.entry.entity_id,
      {
        aliases: this._aliases
          .map((alias) => alias.trim())
          .filter((alias) => alias),
      }
    );
    fireEvent(this, "entity-entry-updated", result.entity_entry);
  }

  private async _toggleAssistant(ev) {
    exposeEntities(
      this.hass,
      [ev.target.assistant],
      [this.entry.entity_id],
      ev.target.checked
    );
    const entry = await getExtendedEntityRegistryEntry(
      this.hass,
      this.entry.entity_id
    );
    fireEvent(this, "entity-entry-updated", entry);
  }

  private async _toggleAll(ev) {
    exposeEntities(
      this.hass,
      voiceAssistantKeys,
      [this.entry.entity_id],
      ev.target.checked
    );
    const entry = await getExtendedEntityRegistryEntry(
      this.hass,
      this.entry.entity_id
    );
    fireEvent(this, "entity-entry-updated", entry);
  }

  static get styles(): CSSResultGroup {
    return [
      haStyle,
      css`
        :host {
          display: block;
          margin: 32px;
          margin-top: 0;
          --settings-row-prefix-display: contents;
        }
        ha-settings-row {
          padding: 0;
        }
        img {
          height: 32px;
          width: 32px;
          margin-right: 16px;
        }
        ha-aliases-editor {
          display: block;
        }
        ha-alert {
          display: block;
          margin-top: 16px;
        }
        ha-formfield {
          margin-left: -8px;
        }
        ha-checkbox {
          --mdc-checkbox-state-layer-size: 40px;
        }
        .header {
          margin-top: 8px;
          margin-bottom: 4px;
        }
        .description {
          color: var(--secondary-text-color);
          font-size: 14px;
          line-height: 20px;
          margin-top: 0;
          margin-bottom: 16px;
        }
      `,
    ];
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "entity-registry-settings": EntityRegistrySettings;
  }
  interface HASSDomEvents {
    "entity-entry-updated": ExtEntityRegistryEntry;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "entity-voice-settings": EntityVoiceSettings;
  }
}
