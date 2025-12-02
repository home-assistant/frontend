import { mdiCog } from "@mdi/js";
import type { PropertyValues } from "lit";
import { css, html, LitElement, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import { fireEvent } from "../common/dom/fire_event";
import { stopPropagation } from "../common/dom/stop_propagation";
import { debounce } from "../common/util/debounce";
import type { ConfigEntry, SubEntry } from "../data/config_entries";
import { getConfigEntry, getSubEntries } from "../data/config_entries";
import type { Agent } from "../data/conversation";
import { listAgents } from "../data/conversation";
import { fetchIntegrationManifest } from "../data/integration";
import { showOptionsFlowDialog } from "../dialogs/config-flow/show-dialog-options-flow";
import type { HomeAssistant } from "../types";
import "./ha-list-item";
import "./ha-select";
import type { HaSelect } from "./ha-select";
import { getExtendedEntityRegistryEntry } from "../data/entity_registry";
import { showSubConfigFlowDialog } from "../dialogs/config-flow/show-dialog-sub-config-flow";

const NONE = "__NONE_OPTION__";

@customElement("ha-conversation-agent-picker")
export class HaConversationAgentPicker extends LitElement {
  @property() public value?: string;

  @property() public language?: string;

  @property() public label?: string;

  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ type: Boolean, reflect: true }) public disabled = false;

  @property({ type: Boolean }) public required = false;

  @state() _agents?: Agent[];

  @state() private _configEntry?: ConfigEntry;

  @state() private _subConfigEntry?: SubEntry;

  protected render() {
    if (!this._agents) {
      return nothing;
    }
    let value = this.value;
    if (!value && this.required) {
      // Select Home Assistant conversation agent if it supports the language
      for (const agent of this._agents) {
        if (
          agent.id === "conversation.home_assistant" &&
          agent.supported_languages.includes(this.language!)
        ) {
          value = agent.id;
          break;
        }
      }
      if (!value) {
        // Select the first agent that supports the language
        for (const agent of this._agents) {
          if (
            agent.supported_languages === "*" &&
            agent.supported_languages.includes(this.language!)
          ) {
            value = agent.id;
            break;
          }
        }
      }
    }
    if (!value) {
      value = NONE;
    }

    return html`
      <ha-select
        .label=${this.label ||
        this.hass!.localize(
          "ui.components.coversation-agent-picker.conversation_agent"
        )}
        .value=${value}
        .required=${this.required}
        .disabled=${this.disabled}
        @selected=${this._changed}
        @closed=${stopPropagation}
        fixedMenuPosition
        naturalMenuWidth
      >
        ${!this.required
          ? html`<ha-list-item .value=${NONE}>
              ${this.hass!.localize(
                "ui.components.coversation-agent-picker.none"
              )}
            </ha-list-item>`
          : nothing}
        ${this._agents.map(
          (agent) =>
            html`<ha-list-item
              .value=${agent.id}
              .disabled=${agent.supported_languages !== "*" &&
              agent.supported_languages.length === 0}
            >
              ${agent.name}
            </ha-list-item>`
        )}</ha-select
      >${(this._subConfigEntry &&
        this._configEntry?.supported_subentry_types[
          this._subConfigEntry.subentry_type
        ]?.supports_reconfigure) ||
      this._configEntry?.supports_options
        ? html`<ha-icon-button
            .path=${mdiCog}
            @click=${this._openOptionsFlow}
          ></ha-icon-button>`
        : ""}
    `;
  }

  protected willUpdate(changedProperties: PropertyValues<this>): void {
    super.willUpdate(changedProperties);
    if (!this.hasUpdated) {
      this._updateAgents();
    } else if (changedProperties.has("language")) {
      this._debouncedUpdateAgents();
    }

    if (changedProperties.has("value")) {
      this._maybeFetchConfigEntry();
    }
  }

  private async _maybeFetchConfigEntry() {
    if (!this.value || !(this.value in this.hass.entities)) {
      this._configEntry = undefined;
      return;
    }
    try {
      const regEntry = await getExtendedEntityRegistryEntry(
        this.hass,
        this.value
      );

      if (!regEntry.config_entry_id) {
        this._configEntry = undefined;
        return;
      }

      this._configEntry = (
        await getConfigEntry(this.hass, regEntry.config_entry_id)
      ).config_entry;

      if (!regEntry.config_subentry_id) {
        this._subConfigEntry = undefined;
      } else {
        this._subConfigEntry = (
          await getSubEntries(this.hass, regEntry.config_entry_id)
        ).find((entry) => entry.subentry_id === regEntry.config_subentry_id);
      }
    } catch (_err) {
      this._configEntry = undefined;
      this._subConfigEntry = undefined;
    }
  }

  private _debouncedUpdateAgents = debounce(() => this._updateAgents(), 500);

  private async _updateAgents() {
    const { agents } = await listAgents(
      this.hass,
      this.language,
      this.hass.config.country || undefined
    );

    this._agents = agents;

    if (!this.value) {
      return;
    }

    const selectedAgent = agents.find((agent) => agent.id === this.value);

    fireEvent(this, "supported-languages-changed", {
      value: selectedAgent?.supported_languages,
    });

    if (
      !selectedAgent ||
      (selectedAgent.supported_languages !== "*" &&
        selectedAgent.supported_languages.length === 0)
    ) {
      this.value = undefined;
      fireEvent(this, "value-changed", { value: this.value });
    }
  }

  private async _openOptionsFlow() {
    if (!this._configEntry) {
      return;
    }

    if (
      this._subConfigEntry &&
      this._configEntry.supported_subentry_types[
        this._subConfigEntry.subentry_type
      ]?.supports_reconfigure
    ) {
      showSubConfigFlowDialog(
        this,
        this._configEntry,
        this._subConfigEntry.subentry_type,
        {
          startFlowHandler: this._configEntry.entry_id,
          subEntryId: this._subConfigEntry.subentry_id,
        }
      );
      return;
    }

    showOptionsFlowDialog(this, this._configEntry, {
      manifest: await fetchIntegrationManifest(
        this.hass,
        this._configEntry.domain
      ),
    });
  }

  static styles = css`
    :host {
      display: flex;
      align-items: center;
    }
    ha-select {
      width: 100%;
    }
    ha-icon-button {
      color: var(--secondary-text-color);
    }
  `;

  private _changed(ev): void {
    const target = ev.target as HaSelect;
    if (
      !this.hass ||
      target.value === "" ||
      target.value === this.value ||
      (this.value === undefined && target.value === NONE)
    ) {
      return;
    }
    this.value = target.value === NONE ? undefined : target.value;
    fireEvent(this, "value-changed", { value: this.value });
    fireEvent(this, "supported-languages-changed", {
      value: this._agents!.find((agent) => agent.id === this.value)
        ?.supported_languages,
    });
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-conversation-agent-picker": HaConversationAgentPicker;
  }
  interface HASSDomEvents {
    "supported-languages-changed": { value: "*" | string[] | undefined };
  }
}
