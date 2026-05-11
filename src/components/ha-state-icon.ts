import { consume, type ContextType } from "@lit/context";
import type { HassEntity } from "home-assistant-js-websocket";
import { html, LitElement, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import { until } from "lit/directives/until";
import { computeStateDomain } from "../common/entity/compute_state_domain";
import {
  configContext,
  connectionContext,
  registriesContext,
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
  @consume({ context: registriesContext, subscribe: true })
  protected _registries!: ContextType<typeof registriesContext>;

  protected render() {
    const overrideIcon =
      this.icon ||
      (this.stateObj &&
        this._registries?.entities[this.stateObj.entity_id]?.icon) ||
      this.stateObj?.attributes.icon;
    if (overrideIcon) {
      return html`<ha-icon .icon=${overrideIcon}></ha-icon>`;
    }
    if (!this.stateObj) {
      return nothing;
    }
    if (!this._config || !this._connection) {
      return this._renderFallback();
    }
    const icon = entityIcon(
      this._registries.entities,
      this._config?.config,
      this._connection?.connection,
      this.stateObj,
      this.stateValue
    ).then((icn) => {
      if (icn) {
        return html`<ha-icon .icon=${icn}></ha-icon>`;
      }
      return this._renderFallback();
    });
    return html`${until(icon)}`;
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
