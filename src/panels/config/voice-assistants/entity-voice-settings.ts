import { mdiAlertCircle } from "@mdi/js";
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
import { fetchCloudAlexaEntity } from "../../../data/alexa";
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
  fetchCloudGoogleEntity,
  GoogleEntity,
} from "../../../data/google_assistant";
import {
  exposeEntities,
  ExposeEntitySettings,
  voiceAssistants,
} from "../../../data/expose";
import { SubscribeMixin } from "../../../mixins/subscribe-mixin";
import { haStyle } from "../../../resources/styles";
import type { HomeAssistant } from "../../../types";
import { brandsUrl } from "../../../util/brands-url";
import { EntityRegistrySettings } from "../entities/entity-registry-settings";
import { documentationUrl } from "../../../util/documentation-url";

@customElement("entity-voice-settings")
export class EntityVoiceSettings extends SubscribeMixin(LitElement) {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property() public entityId!: string;

  @property({ attribute: false }) public exposed!: ExposeEntitySettings;

  @property({ attribute: false }) public entry?: ExtEntityRegistryEntry;

  @state() private _cloudStatus?: CloudStatus;

  @state() private _aliases?: string[];

  @state() private _googleEntity?: GoogleEntity;

  @state() private _unsupported: Partial<
    Record<"cloud.google_assistant" | "cloud.alexa" | "conversation", boolean>
  > = {};

  protected willUpdate(changedProps: PropertyValues<this>) {
    if (!isComponentLoaded(this.hass, "cloud")) {
      return;
    }
    if (changedProps.has("entityId") && this.entityId) {
      this._fetchEntities();
    }
    if (!this.hasUpdated) {
      fetchCloudStatus(this.hass).then((status) => {
        this._cloudStatus = status;
      });
    }
  }

  private async _fetchEntities() {
    try {
      const googleEntity = await fetchCloudGoogleEntity(
        this.hass,
        this.entityId
      );
      this._googleEntity = googleEntity;
      this.requestUpdate("_googleEntity");
    } catch (err: any) {
      if (err.code === "not_supported") {
        this._unsupported["cloud.google_assistant"] = true;
        this.requestUpdate("_unsupported");
      }
    }

    try {
      await fetchCloudAlexaEntity(this.hass, this.entityId);
    } catch (err: any) {
      if (err.code === "not_supported") {
        this._unsupported["cloud.alexa"] = true;
        this.requestUpdate("_unsupported");
      }
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

    const showAssistants = [...Object.keys(voiceAssistants)];
    const uiAssistants = [...showAssistants];

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

    const uiExposed = uiAssistants.some((key) => this.exposed[key]);

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

    const manExposedAlexa = alexaManual && manFilterFuncs!.alexa(this.entityId);
    const manExposedGoogle =
      googleManual && manFilterFuncs!.google(this.entityId);

    const anyExposed = uiExposed || manExposedAlexa || manExposedGoogle;

    return html`
      <ha-settings-row>
        <h3 slot="heading">
          ${this.hass.localize("ui.dialogs.voice-settings.expose_header")}
        </h3>
        <ha-switch
          @change=${this._toggleAll}
          .assistants=${uiAssistants}
          .checked=${anyExposed}
        ></ha-switch>
      </ha-settings-row>
      ${anyExposed
        ? showAssistants.map((key) => {
            const supported = !this._unsupported[key];

            const exposed =
              alexaManual && key === "cloud.alexa"
                ? manExposedAlexa
                : googleManual && key === "cloud.google_assistant"
                ? manExposedGoogle
                : this.exposed[key];

            const manualConfig =
              (alexaManual && key === "cloud.alexa") ||
              (googleManual && key === "cloud.google_assistant");

            const support2fa =
              key === "cloud.google_assistant" &&
              !googleManual &&
              supported &&
              this._googleEntity?.might_2fa;

            return html`
              <ha-settings-row .threeLine=${!supported && manualConfig}>
                <img
                  alt=""
                  src=${brandsUrl({
                    domain: voiceAssistants[key].domain,
                    type: "icon",
                    darkOptimized: this.hass.themes?.darkMode,
                  })}
                  crossorigin="anonymous"
                  referrerpolicy="no-referrer"
                  slot="prefix"
                />
                <span slot="heading">${voiceAssistants[key].name}</span>
                ${!supported
                  ? html`<div slot="description" class="unsupported">
                      <ha-svg-icon .path=${mdiAlertCircle}></ha-svg-icon>
                      ${this.hass.localize(
                        "ui.dialogs.voice-settings.unsupported"
                      )}
                    </div>`
                  : nothing}
                ${manualConfig
                  ? html`
                      <div slot="description">
                        ${this.hass.localize(
                          "ui.dialogs.voice-settings.manual_config"
                        )}
                      </div>
                    `
                  : nothing}
                ${support2fa
                  ? html`
                      <ha-formfield
                        slot="description"
                        .label=${this.hass.localize(
                          "ui.dialogs.voice-settings.ask_pin"
                        )}
                      >
                        <ha-checkbox
                          .checked=${!this._googleEntity!.disable_2fa}
                          @change=${this._2faChanged}
                        ></ha-checkbox>
                      </ha-formfield>
                    `
                  : nothing}
                <ha-switch
                  .assistant=${key}
                  @change=${this._toggleAssistant}
                  .disabled=${manualConfig || (!exposed && !supported)}
                  .checked=${exposed}
                ></ha-switch>
              </ha-settings-row>
            `;
          })
        : nothing}

      <h3 class="header">
        ${this.hass.localize("ui.dialogs.voice-settings.aliases_header")}
      </h3>

      <p class="description">
        ${this.hass.localize("ui.dialogs.voice-settings.aliases_description")}
      </p>

      ${!this.entry
        ? html`<ha-alert alert-type="warning">
            ${this.hass.localize(
              "ui.dialogs.voice-settings.aliases_no_unique_id",
              {
                faq_link: html`<a
                  href=${documentationUrl(this.hass, "/faq/unique_id")}
                  target="_blank"
                  rel="noreferrer"
                  >${this.hass.localize("ui.dialogs.entity_registry.faq")}</a
                >`,
              }
            )}
          </ha-alert>`
        : html`<ha-aliases-editor
            .hass=${this.hass}
            .aliases=${this._aliases ?? this.entry.aliases}
            @value-changed=${this._aliasesChanged}
            @blur=${this._saveAliases}
          ></ha-aliases-editor>`}
    `;
  }

  private _aliasesChanged(ev) {
    this._aliases = ev.detail.value;
  }

  private async _2faChanged(ev) {
    try {
      await updateCloudGoogleEntityConfig(
        this.hass,
        this.entityId,
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
    const result = await updateEntityRegistryEntry(this.hass, this.entityId, {
      aliases: this._aliases
        .map((alias) => alias.trim())
        .filter((alias) => alias),
    });
    fireEvent(this, "entity-entry-updated", result.entity_entry);
  }

  private async _toggleAssistant(ev) {
    exposeEntities(
      this.hass,
      [ev.target.assistant],
      [this.entityId],
      ev.target.checked
    );
    if (this.entry) {
      const entry = await getExtendedEntityRegistryEntry(
        this.hass,
        this.entityId
      );
      fireEvent(this, "entity-entry-updated", entry);
    }
    fireEvent(this, "exposed-entities-changed");
  }

  private async _toggleAll(ev) {
    const expose = ev.target.checked;

    const assistants = expose
      ? ev.target.assistants.filter((key) => !this._unsupported[key])
      : ev.target.assistants;

    exposeEntities(this.hass, assistants, [this.entityId], ev.target.checked);
    if (this.entry) {
      const entry = await getExtendedEntityRegistryEntry(
        this.hass,
        this.entityId
      );
      fireEvent(this, "entity-entry-updated", entry);
    }
    fireEvent(this, "exposed-entities-changed");
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
          --settings-row-content-display: contents;
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
        .unsupported {
          display: flex;
          align-items: center;
        }
        .unsupported ha-svg-icon {
          color: var(--error-color);
          --mdc-icon-size: 16px;
          margin-right: 4px;
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
