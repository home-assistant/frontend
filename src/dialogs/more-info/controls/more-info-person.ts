import {
  LitElement,
  html,
  TemplateResult,
  CSSResult,
  css,
  property,
  customElement,
} from "lit-element";
import { HassEntity } from "home-assistant-js-websocket";
import "@material/mwc-button";

import "../../../components/map/ha-map";

import { HomeAssistant } from "../../../types";
import { showZoneEditor } from "../../../data/zone";
import { fireEvent } from "../../../common/dom/fire_event";

@customElement("more-info-person")
class MoreInfoPerson extends LitElement {
  @property() public hass!: HomeAssistant;
  @property() public stateObj?: HassEntity;

  protected render(): TemplateResult {
    if (!this.hass || !this.stateObj) {
      return html``;
    }

    return html`
      <ha-attributes
        .stateObj=${this.stateObj}
        extraFilters="id,user_id,editable"
      ></ha-attributes>
      ${this.stateObj.attributes.latitude && this.stateObj.attributes.longitude
        ? html`
            <ha-map
              .hass=${this.hass}
              .entities=${[this.stateObj.entity_id]}
            ></ha-map>
          `
        : ""}
      ${!__DEMO__ &&
      this.hass.user?.is_admin &&
      this.stateObj.state === "not_home" &&
      this.stateObj.attributes.latitude &&
      this.stateObj.attributes.longitude
        ? html`
            <div class="actions">
              <mwc-button @click=${this._handleAction}>
                ${this.hass.localize(
                  "ui.dialogs.more_info_control.person.create_zone"
                )}
              </mwc-button>
            </div>
          `
        : ""}
    `;
  }

  private _handleAction() {
    showZoneEditor(this, {
      latitude: this.stateObj!.attributes.latitude,
      longitude: this.stateObj!.attributes.longitude,
    });
    fireEvent(this, "hass-more-info", { entityId: null });
  }

  static get styles(): CSSResult {
    return css`
      .flex {
        display: flex;
        justify-content: space-between;
      }
      .actions {
        margin: 36px 0 8px 0;
        text-align: right;
      }
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "more-info-person": MoreInfoPerson;
  }
}
