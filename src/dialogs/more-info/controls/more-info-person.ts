import type { HassEntity } from "home-assistant-js-websocket";
import { css, html, LitElement, nothing } from "lit";
import { customElement, property } from "lit/decorators";
import memoizeOne from "memoize-one";
import { fireEvent } from "../../../common/dom/fire_event";
import "../../../components/ha-attributes";
import "../../../components/ha-button";
import "../../../components/map/ha-map";
import { showZoneEditor } from "../../../data/zone";
import type { HomeAssistant } from "../../../types";

@customElement("more-info-person")
class MoreInfoPerson extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ attribute: false }) public stateObj?: HassEntity;

  private _entityArray = memoizeOne((entityId: string) => [entityId]);

  protected render() {
    if (!this.hass || !this.stateObj) {
      return nothing;
    }

    return html`
      ${this.stateObj.attributes.latitude && this.stateObj.attributes.longitude
        ? html`
            <ha-map
              .hass=${this.hass}
              .entities=${this._entityArray(this.stateObj.entity_id)}
              auto-fit
            ></ha-map>
          `
        : ""}
      ${!__DEMO__ &&
      this.hass.user?.is_admin &&
      this.stateObj.attributes.latitude &&
      this.stateObj.attributes.longitude
        ? html`
            <div class="actions">
              <ha-button
                appearance="plain"
                size="small"
                @click=${this._handleAction}
              >
                ${this.hass.localize(
                  "ui.dialogs.more_info_control.person.create_zone"
                )}
              </ha-button>
            </div>
          `
        : ""}
      <ha-attributes
        .hass=${this.hass}
        .stateObj=${this.stateObj}
        extra-filters="id,user_id,editable,device_trackers"
      ></ha-attributes>
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
      margin: 8px 0;
      text-align: right;
    }
    ha-map {
      margin-top: 16px;
      margin-bottom: 16px;
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    "more-info-person": MoreInfoPerson;
  }
}
