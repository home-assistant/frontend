import {
  LitElement,
  TemplateResult,
  css,
  CSSResult,
  html,
  property,
  PropertyValues,
  query,
} from "lit-element";
import "../ha-icon";
import { computeStateDomain } from "../../common/entity/compute_state_domain";
import { stateIcon } from "../../common/entity/state_icon";
import { HassEntity } from "home-assistant-js-websocket";
// Not duplicate, this is for typing.
// tslint:disable-next-line
import { HaIcon } from "../ha-icon";
import { HomeAssistant } from "../../types";
import { computeActiveState } from "../../common/entity/compute_active_state";

class StateBadge extends LitElement {
  public hass?: HomeAssistant;
  @property() public stateObj?: HassEntity;
  @property() public overrideIcon?: string;
  @property() public overrideImage?: string;
  @property() public stateColor?: boolean;
  @query("ha-icon") private _icon!: HaIcon;

  protected render(): TemplateResult | void {
    const stateObj = this.stateObj;

    if (!stateObj) {
      return html``;
    }

    return html`
      <ha-icon
        id="icon"
        data-domain=${this.stateColor ? computeStateDomain(stateObj) : ""}
        data-state=${this.stateColor ? computeActiveState(stateObj) : ""}
        .icon=${this.overrideIcon || stateIcon(stateObj)}
      ></ha-icon>
    `;
  }

  protected updated(changedProps: PropertyValues) {
    if (!changedProps.has("stateObj") || !this.stateObj) {
      return;
    }
    const stateObj = this.stateObj;

    const iconStyle: Partial<CSSStyleDeclaration> = {
      color: "",
      filter: "",
    };
    const hostStyle: Partial<CSSStyleDeclaration> = {
      backgroundImage: "",
    };
    if (stateObj) {
      // hide icon if we have entity picture
      if (
        (stateObj.attributes.entity_picture && !this.overrideIcon) ||
        this.overrideImage
      ) {
        let imageUrl = this.overrideImage || stateObj.attributes.entity_picture;
        if (this.hass) {
          imageUrl = this.hass.hassUrl(imageUrl);
        }
        hostStyle.backgroundImage = `url(${imageUrl})`;
        iconStyle.display = "none";
      } else {
        if (stateObj.attributes.hs_color) {
          const hue = stateObj.attributes.hs_color[0];
          const sat = stateObj.attributes.hs_color[1];
          if (sat > 10) {
            iconStyle.color = `hsl(${hue}, 100%, ${100 - sat / 2}%)`;
          }
        }
        if (stateObj.attributes.brightness) {
          const brightness = stateObj.attributes.brightness;
          if (typeof brightness !== "number") {
            const errorMessage = `Type error: state-badge expected number, but type of ${
              stateObj.entity_id
            }.attributes.brightness is ${typeof brightness} (${brightness})`;
            // tslint:disable-next-line
            console.warn(errorMessage);
          }
          // lowest brighntess will be around 50% (that's pretty dark)
          iconStyle.filter = `brightness(${(brightness + 245) / 5}%)`;
        }
      }
    }
    Object.assign(this._icon.style, iconStyle);
    Object.assign(this.style, hostStyle);
  }

  static get styles(): CSSResult {
    return css`
      :host {
        position: relative;
        display: inline-block;
        width: 40px;
        color: var(--paper-item-icon-color, #44739e);
        border-radius: 50%;
        height: 40px;
        text-align: center;
        background-size: cover;
        line-height: 40px;
        vertical-align: middle;
      }

      ha-icon {
        transition: color 0.3s ease-in-out, filter 0.3s ease-in-out;
      }

      ha-icon[data-domain="alarm_control_panel"][data-state="disarmed"],
      ha-icon[data-domain="alert"][data-state="on"],
      ha-icon[data-domain="automation"][data-state="on"],
      ha-icon[data-domain="binary_sensor"][data-state="on"],
      ha-icon[data-domain="calendar"][data-state="on"],
      ha-icon[data-domain="camera"][data-state="streaming"],
      ha-icon[data-domain="cover"][data-state="open"],
      ha-icon[data-domain="fan"][data-state="on"],
      ha-icon[data-domain="light"][data-state="on"],
      ha-icon[data-domain="input_boolean"][data-state="on"],
      ha-icon[data-domain="lock"][data-state="unlocked"],
      ha-icon[data-domain="media_player"][data-state="paused"],
      ha-icon[data-domain="media_player"][data-state="playing"],
      ha-icon[data-domain="plant"][data-state="problem"],
      ha-icon[data-domain="script"][data-state="running"],
      ha-icon[data-domain="sun"][data-state="above_horizon"],
      ha-icon[data-domain="switch"][data-state="on"],
      ha-icon[data-domain="timer"][data-state="active"],
      ha-icon[data-domain="timer"][data-state="paused"],
      ha-icon[data-domain="vacuum"][data-state="cleaning"],
      ha-icon[data-domain="zwave"][data-state="dead"] {
        color: var(--paper-item-icon-active-color, #fdd835);
      }

      ha-icon[data-domain="climate"][data-state="cooling"] {
        color: var(--cool-color, #2b9af9);
      }

      ha-icon[data-domain="climate"][data-state="heating"] {
        color: var(--heat-color, #ff8100);
      }

      /* Color the icon if unavailable */
      ha-icon[data-state="unavailable"] {
        color: var(--state-icon-unavailable-color);
      }
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "state-badge": StateBadge;
  }
}

customElements.define("state-badge", StateBadge);
