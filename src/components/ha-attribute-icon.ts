import { consume } from "@lit/context";
import type { ContextType } from "@lit/context";
import type { HassEntity } from "home-assistant-js-websocket";
import type { PropertyValues } from "lit";
import { html, LitElement, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
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

  @state() private _resolvedIcon?: string;

  // Resolving the icon in render() created a new promise (and a `until()`
  // directive chain) on every render. Resolve it into state instead, guarded so
  // only the latest resolution wins.
  private _iconRequest = 0;

  protected willUpdate(changedProps: PropertyValues): void {
    super.willUpdate(changedProps);
    if (
      changedProps.has("icon") ||
      changedProps.has("stateObj") ||
      changedProps.has("attribute") ||
      changedProps.has("attributeValue") ||
      changedProps.has("_config") ||
      changedProps.has("_connection") ||
      changedProps.has("_entities")
    ) {
      this._loadIcon();
    }
  }

  private async _loadIcon(): Promise<void> {
    if (
      this.icon ||
      !this.stateObj ||
      !this.attribute ||
      !this._config ||
      !this._connection ||
      !this._entities
    ) {
      this._resolvedIcon = undefined;
      return;
    }
    const request = ++this._iconRequest;
    const icon = await attributeIcon(
      this._config.config,
      this._connection.connection,
      this._entities,
      this.stateObj,
      this.attribute,
      this.attributeValue
    );
    if (request === this._iconRequest) {
      this._resolvedIcon = icon || undefined;
    }
  }

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

    if (this._resolvedIcon) {
      return html`<ha-icon .icon=${this._resolvedIcon}></ha-icon>`;
    }

    return nothing;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-attribute-icon": HaAttributeIcon;
  }
}
