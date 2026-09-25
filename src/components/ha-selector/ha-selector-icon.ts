import { consume, type ContextType } from "@lit/context";
import { initialState } from "@lit/task";
import { html, LitElement, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import type { HassEntity } from "home-assistant-js-websocket";
import { AsyncValueTask } from "../../common/controllers/async-value-task";
import { consumeEntityState } from "../../common/decorators/consume-context-entry";
import { fireEvent } from "../../common/dom/fire_event";
import {
  configContext,
  connectionContext,
  entitiesContext,
} from "../../data/context";
import { entityIcon } from "../../data/icons";
import type { IconSelector } from "../../data/selector";
import "../ha-icon-picker";
import "../ha-state-icon";

@customElement("ha-selector-icon")
export class HaIconSelector extends LitElement {
  @property({ attribute: false }) public selector!: IconSelector;

  @property() public value?: string;

  @property() public label?: string;

  @property() public helper?: string;

  @property({ type: Boolean, reflect: true }) public disabled = false;

  @property({ type: Boolean }) public required = true;

  @property({ attribute: false }) public context?: {
    icon_entity?: string;
  };

  @state()
  @consumeEntityState({ entityIdPath: ["context", "icon_entity"] })
  private _stateObj?: HassEntity;

  @state()
  @consume({ context: entitiesContext, subscribe: true })
  private _entities?: ContextType<typeof entitiesContext>;

  @state()
  @consume({ context: configContext, subscribe: true })
  private _config?: ContextType<typeof configContext>;

  @state()
  @consume({ context: connectionContext, subscribe: true })
  private _connection?: ContextType<typeof connectionContext>;

  private _placeholderTask = new AsyncValueTask(this, {
    task: ([
      placeholder,
      attributeIcon,
      entities,
      config,
      connection,
      stateObj,
    ]) => {
      if (
        placeholder ||
        attributeIcon ||
        !entities ||
        !config ||
        !connection ||
        !stateObj
      ) {
        return initialState;
      }
      return entityIcon(
        entities,
        config.config,
        connection.connection,
        stateObj
      );
    },
    args: () => {
      const stateObj = this._stateObj;
      return [
        this.selector.icon?.placeholder,
        stateObj?.attributes.icon,
        this._entities,
        this._config,
        this._connection,
        stateObj,
      ] as const;
    },
  });

  protected render() {
    const stateObj = this._stateObj;

    const placeholder =
      this.selector.icon?.placeholder ||
      stateObj?.attributes.icon ||
      (stateObj && this._placeholderTask.value);

    return html`
      <ha-icon-picker
        .label=${this.label}
        .value=${this.value}
        .required=${this.required}
        .disabled=${this.disabled}
        .helper=${this.helper}
        .placeholder=${this.selector.icon?.placeholder ?? placeholder}
        @value-changed=${this._valueChanged}
      >
        ${
          !placeholder && stateObj
            ? html`
                <ha-state-icon
                  slot="start"
                  .stateObj=${stateObj}
                ></ha-state-icon>
              `
            : nothing
        }
      </ha-icon-picker>
    `;
  }

  private _valueChanged(ev: CustomEvent) {
    fireEvent(this, "value-changed", { value: ev.detail.value });
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-selector-icon": HaIconSelector;
  }
}
