import { consume, type ContextType } from "@lit/context";
import { initialState } from "@lit/task";
import type { HassEntity } from "home-assistant-js-websocket";
import { html, LitElement, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import { AsyncValueTask } from "../common/controllers/async-value-task";
import { computeStateDomain } from "../common/entity/compute_state_domain";
import {
  configContext,
  connectionContext,
  entitiesContext,
} from "../data/context";
import {
  DEFAULT_DOMAIN_ICON,
  entityIcon,
  FALLBACK_DOMAIN_ICONS,
} from "../data/icons";
import "./ha-icon";
import "./ha-svg-icon";
import { consumeEntityState } from "../common/decorators/consume-context-entry";

@customElement("ha-state-icon")
export class HaStateIcon extends LitElement {
  @property({ attribute: false }) public stateObj?: HassEntity;

  @state()
  @consumeEntityState({ entityIdPath: ["entityId"] })
  private _consumeStateObj?: HassEntity;

  @property({ attribute: false }) public entityId?: string;

  @property({ attribute: false }) public stateValue?: string;

  @property() public icon?: string;

  @state()
  @consume({ context: configContext, subscribe: true })
  protected _config?: ContextType<typeof configContext>;

  @state()
  @consume({ context: connectionContext, subscribe: true })
  protected _connection?: ContextType<typeof connectionContext>;

  @state()
  @consume({ context: entitiesContext, subscribe: true })
  protected _entities?: ContextType<typeof entitiesContext>;

  private get _stateObj(): HassEntity | undefined {
    return this.stateObj ?? this._consumeStateObj;
  }

  private get _overrideIcon(): string | undefined {
    return (
      this.icon ||
      (this._stateObj && this._entities?.[this._stateObj.entity_id]?.icon) ||
      this._stateObj?.attributes.icon
    );
  }

  private _iconTask = new AsyncValueTask(this, {
    task: ([
      overrideIcon,
      entities,
      config,
      connection,
      stateObj,
      stateValue,
    ]) => {
      if (overrideIcon || !entities || !config || !connection || !stateObj) {
        return initialState;
      }
      return entityIcon(
        entities,
        config.config,
        connection.connection,
        stateObj,
        stateValue
      );
    },
    args: () =>
      [
        this._overrideIcon,
        this._entities,
        this._config,
        this._connection,
        this._stateObj,
        this.stateValue,
      ] as const,
  });

  protected render() {
    const overrideIcon = this._overrideIcon;
    if (overrideIcon) {
      return html`<ha-icon .icon=${overrideIcon}></ha-icon>`;
    }
    if (!this._stateObj) {
      return nothing;
    }
    if (!this._config || !this._connection || !this._entities) {
      return this._renderFallback();
    }
    if (!this._iconTask.resolved) {
      return nothing;
    }
    return this._iconTask.value
      ? html`<ha-icon .icon=${this._iconTask.value}></ha-icon>`
      : this._renderFallback();
  }

  private _renderFallback() {
    const domain = computeStateDomain(this._stateObj!);

    return html`
      <ha-svg-icon
        .path=${FALLBACK_DOMAIN_ICONS[domain] || DEFAULT_DOMAIN_ICON}
      ></ha-svg-icon>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-state-icon": HaStateIcon;
  }
}
