import { consume, type ContextType } from "@lit/context";
import type { HassEntity } from "home-assistant-js-websocket";
import type { PropertyValues } from "lit";
import { html, LitElement, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
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

@customElement("ha-state-icon")
export class HaStateIcon extends LitElement {
  @property({ attribute: false }) public stateObj?: HassEntity;

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

  // undefined: not resolved yet (render nothing, as the old `until` did).
  // null: resolved, but no icon found (render the fallback).
  @state() private _resolvedIcon?: string | null;

  // Resolving the icon in render() created a new promise (and a `until()`
  // directive chain) on every render, so on every state update, which leaked
  // memory on busy dashboards. Resolve it into state instead, guarded so only
  // the latest resolution wins.
  private _iconRequest = 0;

  private get _overrideIcon(): string | undefined {
    return (
      this.icon ||
      (this.stateObj && this._entities?.[this.stateObj.entity_id]?.icon) ||
      this.stateObj?.attributes.icon
    );
  }

  protected willUpdate(changedProps: PropertyValues): void {
    super.willUpdate(changedProps);
    if (
      changedProps.has("icon") ||
      changedProps.has("stateObj") ||
      changedProps.has("stateValue") ||
      changedProps.has("_entities") ||
      changedProps.has("_config") ||
      changedProps.has("_connection")
    ) {
      this._loadIcon();
    }
  }

  private async _loadIcon(): Promise<void> {
    if (
      this._overrideIcon ||
      !this.stateObj ||
      !this._config ||
      !this._connection ||
      !this._entities
    ) {
      this._resolvedIcon = undefined;
      return;
    }
    const request = ++this._iconRequest;
    const icon = await entityIcon(
      this._entities,
      this._config.config,
      this._connection.connection,
      this.stateObj,
      this.stateValue
    );
    if (request === this._iconRequest) {
      this._resolvedIcon = icon || null;
    }
  }

  protected render() {
    const overrideIcon = this._overrideIcon;
    if (overrideIcon) {
      return html`<ha-icon .icon=${overrideIcon}></ha-icon>`;
    }
    if (!this.stateObj) {
      return nothing;
    }
    if (!this._config || !this._connection || !this._entities) {
      return this._renderFallback();
    }
    if (this._resolvedIcon === undefined) {
      return nothing;
    }
    if (this._resolvedIcon) {
      return html`<ha-icon .icon=${this._resolvedIcon}></ha-icon>`;
    }
    return this._renderFallback();
  }

  private _renderFallback() {
    const domain = computeStateDomain(this.stateObj!);

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
