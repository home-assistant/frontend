import { consume } from "@lit/context";
import type { ContextType } from "@lit/context";
import { initialState } from "@lit/task";
import type { HassEntity } from "home-assistant-js-websocket";
import { html, LitElement, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import { AsyncValueTask } from "../common/controllers/async-value-task";
import {
  configContext,
  connectionContext,
  entitiesContext,
} from "../data/context";
import { attributeIcon } from "../data/icons";
import "./ha-icon";
import "./ha-svg-icon";

@customElement("ha-attribute-icon")
export class HaAttributeIcon extends LitElement {
  @property({ attribute: false }) public stateObj?: HassEntity;

  @property() public attribute?: string;

  @property({ attribute: false }) public attributeValue?: string;

  @property() public icon?: string;

  @state()
  @consume({ context: configContext, subscribe: true })
  private _config?: ContextType<typeof configContext>;

  @state()
  @consume({ context: connectionContext, subscribe: true })
  private _connection?: ContextType<typeof connectionContext>;

  @state()
  @consume({ context: entitiesContext, subscribe: true })
  private _entities?: ContextType<typeof entitiesContext>;

  private _iconTask = new AsyncValueTask(this, {
    task: ([
      icon,
      config,
      connection,
      entities,
      stateObj,
      attribute,
      attributeValue,
    ]) => {
      if (
        icon ||
        !config ||
        !connection ||
        !entities ||
        !stateObj ||
        !attribute
      ) {
        return initialState;
      }
      return attributeIcon(
        config.config,
        connection.connection,
        entities,
        stateObj,
        attribute,
        attributeValue
      );
    },
    args: () =>
      [
        this.icon,
        this._config,
        this._connection,
        this._entities,
        this.stateObj,
        this.attribute,
        this.attributeValue,
      ] as const,
  });

  protected render() {
    if (this.icon) {
      return html`<ha-icon .icon=${this.icon}></ha-icon>`;
    }

    if (!this.stateObj || !this.attribute) {
      return nothing;
    }

    if (!this._config || !this._connection || !this._entities) {
      return nothing;
    }

    return this._iconTask.value
      ? html`<ha-icon .icon=${this._iconTask.value}></ha-icon>`
      : nothing;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-attribute-icon": HaAttributeIcon;
  }
}
