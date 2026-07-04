import { consume } from "@lit/context";
import type { HassEntities, HassEntity } from "home-assistant-js-websocket";
import { css, html, LitElement, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import memoizeOne from "memoize-one";
import { consumeLocalize } from "../../../common/decorators/consume-context-entry";
import { transform } from "../../../common/decorators/transform";
import { fireEvent } from "../../../common/dom/fire_event";
import { getEntityLocation } from "../../../common/entity/get_entity_location";
import type { LocalizeFunc } from "../../../common/translations/localize";
import "../../../components/ha-button";
import "../../../components/map/ha-map";
import { configContext, statesContext } from "../../../data/context";
import { showZoneEditor } from "../../../data/zone";
import type { CurrentUser, HomeAssistantConfig } from "../../../types";

@customElement("more-info-person")
class MoreInfoPerson extends LitElement {
  @property({ attribute: false }) public stateObj?: HassEntity;

  @state()
  @consumeLocalize()
  private _localize!: LocalizeFunc;

  @state()
  @consume({ context: statesContext, subscribe: true })
  private _states!: HassEntities;

  @state()
  @consume({ context: configContext, subscribe: true })
  @transform<HomeAssistantConfig, CurrentUser | undefined>({
    transformer: ({ user }) => user,
  })
  private _user?: CurrentUser;

  private _entityArray = memoizeOne((entityId: string) => [entityId]);

  protected render() {
    if (!this._localize || !this.stateObj) {
      return nothing;
    }

    const location = getEntityLocation(this.stateObj, this._states);
    const hasOwnCoordinates =
      typeof this.stateObj.attributes.latitude === "number" &&
      typeof this.stateObj.attributes.longitude === "number";

    return html`
      ${
        location
          ? html`
              <ha-map
                .entities=${this._entityArray(this.stateObj.entity_id)}
                auto-fit
              ></ha-map>
            `
          : ""
      }
      ${
        !__DEMO__ && this._user?.is_admin && hasOwnCoordinates
          ? html`
              <div class="actions">
                <ha-button
                  appearance="plain"
                  size="s"
                  @click=${this._handleAction}
                >
                  ${this._localize(
                    "ui.dialogs.more_info_control.person.create_zone"
                  )}
                </ha-button>
              </div>
            `
          : ""
      }
    `;
  }

  private _handleAction() {
    showZoneEditor({
      latitude: this.stateObj!.attributes.latitude,
      longitude: this.stateObj!.attributes.longitude,
    });
    fireEvent(this, "hass-more-info", { entityId: null });
  }

  static styles = css`
    .flex {
      display: flex;
      justify-content: space-between;
    }
    .actions {
      margin: var(--ha-space-2) 0;
      text-align: right;
    }
    ha-map {
      margin-top: var(--ha-space-4);
      margin-bottom: var(--ha-space-4);
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    "more-info-person": MoreInfoPerson;
  }
}
