import type { ContextType } from "@lit/context";
import { mdiCog } from "@mdi/js";
import type { PropertyValues } from "lit";
import { css, html, LitElement, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import { consume } from "../common/decorators/consume";
import { consumeLocalize } from "../common/decorators/consume-context-entry";
import { fireEvent } from "../common/dom/fire_event";
import type { LocalizeFunc } from "../common/translations/localize";
import { debounce } from "../common/util/debounce";
import { apiContext, configContext, entitiesContext } from "../data/context";
import type { Agent } from "../data/conversation";
import { listAgents } from "../data/conversation";
import type { EntityConfigFlow } from "../dialogs/config-flow/entity-config-flow";
import {
  fetchEntityConfigFlow,
  showEntityConfigFlow,
} from "../dialogs/config-flow/entity-config-flow";
import "./ha-select";
import type { HaSelectOption, HaSelectSelectEvent } from "./ha-select";

const NONE = "__NONE_OPTION__";

@customElement("ha-conversation-agent-picker")
export class HaConversationAgentPicker extends LitElement {
  @property() public value?: string;

  @property() public language?: string;

  @property() public label?: string;

  @property({ type: Boolean, reflect: true }) public disabled = false;

  @property({ type: Boolean }) public required = false;

  @state() _agents?: Agent[];

  @state() private _configFlow?: EntityConfigFlow;

  @state() @consumeLocalize() private _localize!: LocalizeFunc;

  @consume({ context: apiContext, subscribe: true })
  private _api!: ContextType<typeof apiContext>;

  @consume({ context: configContext, subscribe: true })
  private _config!: ContextType<typeof configContext>;

  @consume({ context: entitiesContext, subscribe: true })
  private _entities!: ContextType<typeof entitiesContext>;

  protected render() {
    if (!this._agents) {
      return nothing;
    }
    let value = this.value;
    if (!value) {
      value = NONE;
    }

    const options: HaSelectOption[] = this._agents.map((agent) => ({
      value: agent.id,
      label: agent.name,
      disabled:
        agent.supported_languages !== "*" &&
        agent.supported_languages.length === 0,
    }));

    if (!this.required) {
      options.unshift({
        value: NONE,
        label: this._localize("ui.components.conversation-agent-picker.none"),
      });
    }

    return html`
      <ha-select
        .label=${
          this.label ||
          this._localize(
            "ui.components.conversation-agent-picker.conversation_agent"
          )
        }
        .value=${value}
        .required=${this.required}
        .disabled=${this.disabled}
        @selected=${this._changed}
        .options=${options}
      ></ha-select
      >${
        this._configFlow
          ? html`<ha-icon-button
              .label=${this._localize(
                "ui.components.conversation-agent-picker.settings"
              )}
              .path=${mdiCog}
              @click=${this._openConfigFlow}
            ></ha-icon-button>`
          : nothing
      }
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
      this._fetchConfigFlow();
    }
  }

  private async _fetchConfigFlow() {
    const entityId = this.value;
    this._configFlow = undefined;
    let configFlow: EntityConfigFlow | undefined;
    try {
      configFlow = entityId
        ? await fetchEntityConfigFlow(this._api, this._entities, entityId)
        : undefined;
    } catch (_err) {
      configFlow = undefined;
    }
    if (entityId === this.value) {
      this._configFlow = configFlow;
    }
  }

  private _debouncedUpdateAgents = debounce(() => this._updateAgents(), 500);

  private async _updateAgents() {
    const { agents } = await listAgents(
      this._api.callWS,
      this.language,
      this._config.config.country || undefined
    );

    this._agents = agents;

    if (!this.value && this.required) {
      let defaultValue: string | undefined;
      // Select Home Assistant conversation agent if it supports the language
      for (const agent of this._agents) {
        if (
          agent.id === "conversation.home_assistant" &&
          (!this.language ||
            agent.supported_languages === "*" ||
            agent.supported_languages.includes(this.language))
        ) {
          defaultValue = agent.id;
          break;
        }
      }
      if (!defaultValue) {
        // Select the first agent that supports the language
        for (const agent of this._agents) {
          if (
            agent.supported_languages === "*" ||
            !this.language ||
            agent.supported_languages.includes(this.language)
          ) {
            defaultValue = agent.id;
            break;
          }
        }
      }
      if (defaultValue) {
        this.value = defaultValue;
        fireEvent(this, "value-changed", { value: this.value });
      }
    }

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

  private _openConfigFlow() {
    if (this._configFlow) {
      showEntityConfigFlow(this, this._api, this._configFlow);
    }
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

  private _changed(ev: HaSelectSelectEvent): void {
    const value = ev.detail.value;
    if (
      value === "" ||
      value === this.value ||
      (this.value === undefined && value === NONE)
    ) {
      return;
    }
    this.value = value === NONE ? undefined : value;
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
