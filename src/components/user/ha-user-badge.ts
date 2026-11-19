import type { HassEntity } from "home-assistant-js-websocket";
import type { PropertyValues } from "lit";
import type { ContextType } from "@lit/context";
import { css, html, LitElement, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import { classMap } from "lit/directives/class-map";
import { styleMap } from "lit/directives/style-map";
import { consume } from "../../common/decorators/consume";
import { consumeEntityStates } from "../../common/decorators/consume-context-entry";
import { transform } from "../../common/decorators/transform";
import { computeDomain } from "../../common/entity/compute_domain";
import type { User } from "../../data/user";
import { computeUserInitials } from "../../data/user";
import { connectionContext, entitiesContext } from "../../data/context";
import type { CurrentUser } from "../../types";

@customElement("ha-user-badge")
class UserBadge extends LitElement {
  @property({ attribute: false }) public user?: User | CurrentUser;

  @state()
  @consume({ context: connectionContext, subscribe: true })
  private _connection?: ContextType<typeof connectionContext>;

  // Read by the @consumeEntityStates decorator below.
  @state()
  @consume({ context: entitiesContext, subscribe: true })
  @transform<ContextType<typeof entitiesContext>, string[]>({
    transformer: (entities) =>
      Object.keys(entities).filter(
        (entityId) => computeDomain(entityId) === "person"
      ),
  })
  protected _personEntityIds?: string[];

  @state()
  @consumeEntityStates({ entityIdPath: ["_personEntityIds"] })
  private _personStates?: Record<string, HassEntity>;

  @state() private _personEntityId?: string;

  public willUpdate(changedProps: PropertyValues) {
    super.willUpdate(changedProps);
    if (changedProps.has("user") || changedProps.has("_personStates")) {
      this._updatePersonEntityId();
    }
  }

  protected render() {
    if (!this.user) {
      return nothing;
    }
    const picture =
      this._personEntityId &&
      (this._personStates?.[this._personEntityId]?.attributes.entity_picture as
        string | undefined);

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
    const userId = this.user?.id;
    this._personEntityId = userId
      ? Object.values(this._personStates ?? {}).find(
          (entity) => entity.attributes.user_id === userId
        )?.entity_id
      : undefined;
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
      border-radius: var(--ha-picture-border-radius);
    }
    .initials {
      display: inline-flex;
      justify-content: center;
      align-items: center;
      box-sizing: border-box;
      width: 100%;
      height: 100%;
      border-radius: var(--ha-picture-border-radius);
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
