import { mdiAlertCircle, mdiCog } from "@mdi/js";
import type { CSSResultGroup, PropertyValues } from "lit";
import { css, html, LitElement, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import memoizeOne from "memoize-one";
import { isComponentLoaded } from "../../../common/config/is_component_loaded";
import { fireEvent } from "../../../common/dom/fire_event";
import type {
  EntityDomainFilter,
  EntityDomainFilterFunc,
} from "../../../common/entity/entity_domain_filter";
import {
  generateEntityDomainFilter,
  isEmptyEntityDomainFilter,
} from "../../../common/entity/entity_domain_filter";
import "../../../components/ha-icon-button";
import "../../../components/ha-md-list-item";
import "../../../components/ha-switch";
import "../../../components/voice-assistant-brand-icon";
import { fetchCloudAlexaEntity } from "../../../data/alexa";
import type { CloudStatus, CloudStatusLoggedIn } from "../../../data/cloud";
import { fetchCloudStatus } from "../../../data/cloud";
import type { ExtEntityRegistryEntry } from "../../../data/entity/entity_registry";
import { getExtendedEntityRegistryEntry } from "../../../data/entity/entity_registry";
import type { ExposeEntitySettings } from "../../../data/expose";
import { exposeEntities, voiceAssistants } from "../../../data/expose";
import type { GoogleEntity } from "../../../data/google_assistant";
import { fetchCloudGoogleEntity } from "../../../data/google_assistant";
import { haStyle } from "../../../resources/styles";
import type { HomeAssistant } from "../../../types";

@customElement("entity-voice-settings")
export class EntityVoiceSettings extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ attribute: false }) public entityId!: string;

  @property({ attribute: false }) public exposed!: ExposeEntitySettings;

  @property({ attribute: false }) public entry?: ExtEntityRegistryEntry;

  @state() private _cloudStatus?: CloudStatus;

  @state() private _googleEntity?: GoogleEntity;

  @state() private _unsupported: Partial<
    Record<"cloud.google_assistant" | "cloud.alexa" | "conversation", boolean>
  > = {};

  protected willUpdate(changedProps: PropertyValues<this>) {
    if (!isComponentLoaded(this.hass.config, "cloud")) {
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
      this._googleEntity = await fetchCloudGoogleEntity(
        this.hass,
        this.entityId
      );
    } catch (err: any) {
      if (err.code === "not_supported") {
        this._unsupported = {
          ...this._unsupported,
          "cloud.google_assistant": true,
        };
      }
    }

    try {
      await fetchCloudAlexaEntity(this.hass, this.entityId);
    } catch (err: any) {
      if (err.code === "not_supported") {
        this._unsupported = { ...this._unsupported, "cloud.alexa": true };
      }
    }
  }

  private _getEntityFilterFuncs = memoizeOne(
    (googleFilter: EntityDomainFilter, alexaFilter: EntityDomainFilter) => ({
      google: generateEntityDomainFilter(
        googleFilter.include_domains,
        googleFilter.include_entities,
        googleFilter.exclude_domains,
        googleFilter.exclude_entities
      ),
      alexa: generateEntityDomainFilter(
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

    const alexaManual =
      alexaEnabled &&
      !isEmptyEntityDomainFilter(
        (this._cloudStatus as CloudStatusLoggedIn).alexa_entities
      );
    const googleManual =
      googleEnabled &&
      !isEmptyEntityDomainFilter(
        (this._cloudStatus as CloudStatusLoggedIn).google_entities
      );

    if (!googleEnabled) {
      showAssistants.splice(
        showAssistants.indexOf("cloud.google_assistant"),
        1
      );
    }

    if (!alexaEnabled) {
      showAssistants.splice(showAssistants.indexOf("cloud.alexa"), 1);
    }

    let manFilterFuncs:
      | {
          google: EntityDomainFilterFunc;
          alexa: EntityDomainFilterFunc;
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

    return html`
      ${showAssistants.map((key) => {
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

        const hasSettings = supported && !manualConfig;

        const aliasCount =
          key === "conversation"
            ? this.entry
              ? this.entry.aliases.filter(Boolean).length
              : undefined
            : key === "cloud.google_assistant"
              ? (this._googleEntity?.aliases?.filter(Boolean).length ?? 0)
              : undefined;

        return html`
          <ha-md-list-item>
            <voice-assistant-brand-icon slot="start" .voiceAssistantId=${key}>
            </voice-assistant-brand-icon>
            <span slot="headline">${voiceAssistants[key].name}</span>
            ${!supported
              ? html`<div slot="supporting-text" class="unsupported">
                  <ha-svg-icon .path=${mdiAlertCircle}></ha-svg-icon>
                  ${this.hass.localize("ui.dialogs.voice-settings.unsupported")}
                </div>`
              : manualConfig
                ? html`
                    <div slot="supporting-text">
                      ${this.hass.localize(
                        "ui.dialogs.voice-settings.manual_config"
                      )}
                    </div>
                  `
                : aliasCount
                  ? html`<div slot="supporting-text">
                      ${this.hass.localize(
                        "ui.dialogs.voice-settings.aliases_count",
                        { count: aliasCount }
                      )}
                    </div>`
                  : nothing}
            <div slot="end" class="trailing">
              ${hasSettings
                ? html`<ha-icon-button
                    .path=${mdiCog}
                    .label=${this.hass.localize(
                      "ui.dialogs.voice-settings.edit_settings",
                      { assistant: voiceAssistants[key].name }
                    )}
                    .assistant=${key}
                    @click=${this._editAssistant}
                  ></ha-icon-button>`
                : nothing}
              <ha-switch
                .assistant=${key}
                @change=${this._toggleAssistant}
                .disabled=${manualConfig || (!exposed && !supported)}
                .checked=${exposed}
              ></ha-switch>
            </div>
          </ha-md-list-item>
        `;
      })}
    `;
  }

  private _editAssistant(ev) {
    fireEvent(this, "edit-assistant", { assistant: ev.target.assistant });
  }

  private async _toggleAssistant(ev) {
    ev.stopPropagation();
    const assistant: string = ev.target.assistant;
    const checked: boolean = ev.target.checked;

    exposeEntities(this.hass, [assistant], [this.entityId], checked);
    fireEvent(this, "exposed-changed", {
      value: { ...this.exposed, [assistant]: checked },
    });

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
          margin: var(--ha-space-8);
          margin-top: 0;
        }
        ha-md-list-item {
          --md-list-item-leading-space: 0;
          --md-list-item-trailing-space: 0;
          --md-item-overflow: visible;
        }
        .trailing {
          display: flex;
          align-items: center;
          gap: var(--ha-space-2);
        }
        .unsupported {
          display: flex;
          align-items: center;
        }
        .unsupported ha-svg-icon {
          color: var(--error-color);
          --mdc-icon-size: 16px;
          margin-right: var(--ha-space-1);
          margin-inline-end: var(--ha-space-1);
          margin-inline-start: initial;
        }
      `,
    ];
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "entity-voice-settings": EntityVoiceSettings;
  }
  interface HASSDomEvents {
    "entity-entry-updated": ExtEntityRegistryEntry;
    "edit-assistant": { assistant: string };
    "exposed-changed": { value: ExposeEntitySettings };
  }
}
