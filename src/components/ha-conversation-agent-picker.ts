import { mdiCog } from "@mdi/js";
import {
  css,
  CSSResultGroup,
  html,
  LitElement,
  nothing,
  PropertyValues,
} from "lit";
import { customElement, property, state } from "lit/decorators";
import { fireEvent } from "../common/dom/fire_event";
import { stopPropagation } from "../common/dom/stop_propagation";
import { debounce } from "../common/util/debounce";
import { ConfigEntry, getConfigEntry } from "../data/config_entries";
import { Agent, listAgents } from "../data/conversation";
import { fetchIntegrationManifest } from "../data/integration";
import { showOptionsFlowDialog } from "../dialogs/config-flow/show-dialog-options-flow";
import { HomeAssistant } from "../types";
import "./ha-list-item";
import "./ha-select";
import type { HaSelect } from "./ha-select";

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

  protected render() {
    if (!this._agents) {
      return nothing;
    }
    const value =
      this.value ??
      (this.required &&
      (!this.language ||
        this._agents
          .find((agent) => agent.id === "homeassistant")
          ?.supported_languages.includes(this.language))
        ? "homeassistant"
        : NONE);
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
      >${this._configEntry?.supports_options
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
    if (!this.value || this.value === "homeassistant") {
      this._configEntry = undefined;
      return;
    }
    try {
      this._configEntry = (
        await getConfigEntry(this.hass, this.value)
      ).config_entry;
    } catch (err) {
      this._configEntry = undefined;
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
    showOptionsFlowDialog(this, this._configEntry, {
      manifest: await fetchIntegrationManifest(
        this.hass,
        this._configEntry.domain
      ),
    });
  }

  static get styles(): CSSResultGroup {
    return css`
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
  }

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
