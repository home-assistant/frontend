import type { HassEntities, HassEntity } from "home-assistant-js-websocket";
import type { PropertyValues } from "lit";
import { consume, type ContextType } from "@lit/context";
import { css, html, LitElement, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import { classMap } from "lit/directives/class-map";
import { styleMap } from "lit/directives/style-map";
import { computeStateDomain } from "../../common/entity/compute_state_domain";
import { consumeEntityState } from "../../common/decorators/consume-context-entry";
import type { User } from "../../data/user";
import { computeUserInitials } from "../../data/user";
import { connectionContext, statesContext } from "../../data/context";
import type { CurrentUser } from "../../types";

@customElement("ha-user-badge")
class UserBadge extends LitElement {
  @property({ attribute: false }) public user?: User | CurrentUser;

  @state()
  @consume({ context: connectionContext, subscribe: true })
  private _connection?: ContextType<typeof connectionContext>;

  @state()
  @consume({ context: statesContext, subscribe: true })
  private _states?: HassEntities;

  /** Set for {@link consumeEntityState} `entityIdPath`; read by context, not in render. */
  @state() private _personEntityId?: string;

  @state()
  @consumeEntityState({ entityIdPath: ["_personEntityId"] })
  private _personState?: HassEntity;

  public willUpdate(changedProps: PropertyValues<this>) {
    super.willUpdate(changedProps);
    if (changedProps.has("user") || changedProps.has("_states" as keyof this)) {
      this._updatePersonEntityId();
    }
  }

  protected render() {
    if (!this.user) {
      return nothing;
    }
    const picture = this._personState?.attributes.entity_picture as
      | string
      | undefined;

    if (picture && this._connection) {
      return html`<div
        style=${styleMap({
          backgroundImage: `url(${this._connection.hassUrl(picture)})`,
        })}
        class="picture"
      ></div>`;
    }
    const initials = computeUserInitials(this.user.name);
    return html`<div
      class="initials ${classMap({ long: initials!.length > 2 })}"
    >
      ${initials}
    </div>`;
  }

  private _updatePersonEntityId() {
    this._personEntityId = undefined;
    if (!this.user || !this._states) {
      return;
    }
    for (const entity of Object.values(this._states)) {
      if (
        entity.attributes.user_id === this.user.id &&
        computeStateDomain(entity) === "person"
      ) {
        this._personEntityId = entity.entity_id;
        return;
      }
    }
  }

  static styles = css`
    :host {
      display: block;
      width: 40px;
      height: 40px;
    }
    .picture {
      width: 100%;
      height: 100%;
      background-size: cover;
      border-radius: var(--ha-border-radius-circle);
    }
    .initials {
      display: inline-flex;
      justify-content: center;
      align-items: center;
      box-sizing: border-box;
      width: 100%;
      height: 100%;
      border-radius: var(--ha-border-radius-circle);
      background-color: var(--light-primary-color);
      text-decoration: none;
      color: var(--text-light-primary-color, var(--primary-text-color));
      overflow: hidden;
    }
    .initials.long {
      font-size: var(--ha-font-size-s);
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-user-badge": UserBadge;
  }
}
