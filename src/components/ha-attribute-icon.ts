import { consume } from "@lit/context";
import type { ContextType } from "@lit/context";
import type { HassEntity } from "home-assistant-js-websocket";
import { html, LitElement, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import { until } from "lit/directives/until";
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

    const icon = attributeIcon(
      this._config.config,
      this._connection.connection,
      this._entities,
      this.stateObj,
      this.attribute,
      this.attributeValue
    ).then((icn) => {
      if (icn) {
        return html`<ha-icon .icon=${icn}></ha-icon>`;
      }
      return nothing;
    });

    return html`${until(icon)}`;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-attribute-icon": HaAttributeIcon;
  }
}
