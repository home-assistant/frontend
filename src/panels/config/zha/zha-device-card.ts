import {
  html,
  LitElement,
  property,
  TemplateResult,
  CSSResult,
  css,
} from "lit-element";
import "@polymer/paper-item/paper-icon-item";
import "@polymer/paper-item/paper-item-body";
import "@polymer/paper-card/paper-card";
import "@polymer/paper-dropdown-menu/paper-dropdown-menu";
import "@polymer/paper-item/paper-item";
import "@polymer/paper-listbox/paper-listbox";
import { fireEvent } from "../../../common/dom/fire_event";
import { haStyle } from "../../../resources/ha-style";
import { HomeAssistant } from "../../../types";

import "../../../components/entity/state-badge";
import { ZHADevice } from "../../../data/zha";

class ZHADeviceCard extends LitElement {
  @property() public hass?: HomeAssistant;
  @property() public narrow?: boolean;
  @property() public device?: ZHADevice;

  protected render(): TemplateResult | void {
    return html`
      <paper-card>
        <div class="card-content">
          <dl>
            <dt class="label">IEEE:</dt>
            <dd class="info">${this.device!.ieee}</dd>
            <dt class="label">Quirk applied:</dt>
            <dd class="info">${this.device!.quirk_applied}</dd>
            <dt class="label">Quirk:</dt>
            <dd class="info">${this.device!.quirk_class}</dd>
          </dl>
        </div>

        <div class="device-entities">
          ${this.device!.entities.map(
            (entity) => html`
              <paper-icon-item
                @click="${this._openMoreInfo}"
                .entity="${entity}"
              >
                <state-badge
                  .stateObj="${this.hass!.states[entity.entity_id]}"
                  slot="item-icon"
                ></state-badge>
                <paper-item-body>
                  <div class="name">${entity.name}</div>
                  <div class="secondary entity-id">${entity.entity_id}</div>
                </paper-item-body>
              </paper-icon-item>
            `
          )}
        </div>
      </paper-card>
    `;
  }

  private _openMoreInfo(ev: MouseEvent): void {
    fireEvent(this, "hass-more-info", {
      entityId: (ev.currentTarget as any).entity.entity_id,
    });
  }

  static get styles(): CSSResult[] {
    return [
      haStyle,
      css`
        :host(:not([narrow])) .device-entities {
          max-height: 225px;
          overflow: auto;
        }
        paper-card {
          flex: 1 0 100%;
          padding-bottom: 10px;
          min-width: 0;
        }
        .device {
          width: 30%;
        }
        .label {
          font-weight: bold;
        }
        .info {
          color: var(--secondary-text-color);
          font-weight: bold;
        }
        dl dt {
          float: left;
          width: 100px;
          text-align: left;
        }
        dt dd {
          margin-left: 10px;
          text-align: left;
        }
        paper-icon-item {
          cursor: pointer;
          padding-top: 4px;
          padding-bottom: 4px;
        }
      `,
    ];
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "zha-device-card": ZHADeviceCard;
  }
}

customElements.define("zha-device-card", ZHADeviceCard);
