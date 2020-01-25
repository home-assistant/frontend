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
import { ifDefined } from "lit-html/directives/if-defined";
import { iconColorCSS } from "../../common/style/icon_color_css";

class StateBadge extends LitElement {
  public hass?: HomeAssistant;
  @property() public stateObj?: HassEntity;
  @property() public overrideIcon?: string;
  @property() public overrideImage?: string;
  @property({ type: Boolean }) public stateColor?: boolean;
  @query("ha-icon") private _icon!: HaIcon;

  protected render(): TemplateResult | void {
    const stateObj = this.stateObj;

    if (!stateObj) {
      return html``;
    }

    const domain = computeStateDomain(stateObj);

    return html`
      <ha-icon
        id="icon"
        data-domain=${ifDefined(
          this.stateColor || (domain === "light" && this.stateColor !== false)
            ? domain
            : undefined
        )}
        data-state=${computeActiveState(stateObj)}
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
        if (stateObj.attributes.hs_color && this.stateColor !== false) {
          const hue = stateObj.attributes.hs_color[0];
          const sat = stateObj.attributes.hs_color[1];
          if (sat > 10) {
            iconStyle.color = `hsl(${hue}, 100%, ${100 - sat / 2}%)`;
          }
        }
        if (stateObj.attributes.brightness && this.stateColor !== false) {
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

      ${iconColorCSS}
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "state-badge": StateBadge;
  }
}

customElements.define("state-badge", StateBadge);
