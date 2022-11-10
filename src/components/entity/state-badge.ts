import { mdiAlert } from "@mdi/js";
import type { HassEntity } from "home-assistant-js-websocket";
import {
  css,
  CSSResultGroup,
  html,
  LitElement,
  PropertyValues,
  TemplateResult,
} from "lit";
import { property, state } from "lit/decorators";
import { ifDefined } from "lit/directives/if-defined";
import { styleMap } from "lit/directives/style-map";
import { computeDomain } from "../../common/entity/compute_domain";
import { computeStateDomain } from "../../common/entity/compute_state_domain";
import { stateActive } from "../../common/entity/state_active";
import { stateColor } from "../../common/entity/state_color";
import { iconColorCSS } from "../../common/style/icon_color_css";
import { cameraUrlWithWidthHeight } from "../../data/camera";
import type { HomeAssistant } from "../../types";
import "../ha-state-icon";

export class StateBadge extends LitElement {
  public hass?: HomeAssistant;

  @property() public stateObj?: HassEntity;

  @property() public overrideIcon?: string;

  @property() public overrideImage?: string;

  @property({ type: Boolean }) public stateColor?: boolean;

  @property({ type: Boolean, reflect: true, attribute: "icon" })
  private _showIcon = true;

  @state() private _iconStyle: { [name: string]: string } = {};

  private get _stateColor() {
    const domain = this.stateObj
      ? computeStateDomain(this.stateObj)
      : undefined;
    return this.stateColor || (domain === "light" && this.stateColor !== false);
  }

  protected render(): TemplateResult {
    const stateObj = this.stateObj;

    // We either need a `stateObj` or one override
    if (!stateObj && !this.overrideIcon && !this.overrideImage) {
      return html`<div class="missing">
        <ha-svg-icon .path=${mdiAlert}></ha-svg-icon>
      </div>`;
    }

    if (!this._showIcon) {
      return html``;
    }

    const domain = stateObj ? computeStateDomain(stateObj) : undefined;
    const active = this._stateColor && stateObj ? stateActive(stateObj) : false;

    return html`<ha-state-icon
      style=${styleMap(this._iconStyle)}
      ?data-active=${active}
      data-domain=${ifDefined(domain)}
      data-state=${ifDefined(stateObj?.state)}
      .icon=${this.overrideIcon}
      .state=${stateObj}
    ></ha-state-icon>`;
  }

  public willUpdate(changedProps: PropertyValues) {
    super.willUpdate(changedProps);
    if (
      !changedProps.has("stateObj") &&
      !changedProps.has("overrideImage") &&
      !changedProps.has("overrideIcon") &&
      !changedProps.has("stateColor")
    ) {
      return;
    }
    const stateObj = this.stateObj;

    const iconStyle: { [name: string]: string } = {};
    const hostStyle: Partial<CSSStyleDeclaration> = {
      backgroundImage: "",
    };

    this._showIcon = true;

    if (stateObj && this.overrideImage === undefined) {
      // hide icon if we have entity picture
      if (
        (stateObj.attributes.entity_picture_local ||
          stateObj.attributes.entity_picture) &&
        !this.overrideIcon
      ) {
        let imageUrl =
          stateObj.attributes.entity_picture_local ||
          stateObj.attributes.entity_picture;
        if (this.hass) {
          imageUrl = this.hass.hassUrl(imageUrl);
        }
        if (computeDomain(stateObj.entity_id) === "camera") {
          imageUrl = cameraUrlWithWidthHeight(imageUrl, 80, 80);
        }
        hostStyle.backgroundImage = `url(${imageUrl})`;
        this._showIcon = false;
      } else if (stateActive(stateObj) && this._stateColor) {
        const iconColor = stateColor(stateObj);
        if (iconColor) {
          iconStyle.color = `rgb(var(--rgb-state-${iconColor}-color))`;
        }
        if (stateObj.attributes.rgb_color) {
          iconStyle.color = `rgb(${stateObj.attributes.rgb_color.join(",")})`;
        }
        if (stateObj.attributes.brightness) {
          const brightness = stateObj.attributes.brightness;
          if (typeof brightness !== "number") {
            const errorMessage = `Type error: state-badge expected number, but type of ${
              stateObj.entity_id
            }.attributes.brightness is ${typeof brightness} (${brightness})`;
            // eslint-disable-next-line
            console.warn(errorMessage);
          }
          // lowest brightness will be around 50% (that's pretty dark)
          iconStyle.filter = `brightness(${(brightness + 245) / 5}%)`;
        }
      }
    } else if (this.overrideImage) {
      let imageUrl = this.overrideImage;
      if (this.hass) {
        imageUrl = this.hass.hassUrl(imageUrl);
      }
      hostStyle.backgroundImage = `url(${imageUrl})`;
      this._showIcon = false;
    }

    this._iconStyle = iconStyle;
    Object.assign(this.style, hostStyle);
  }

  static get styles(): CSSResultGroup {
    return [
      iconColorCSS,
      css`
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
          box-sizing: border-box;
        }
        :host(:focus) {
          outline: none;
        }
        :host(:not([icon]):focus) {
          border: 2px solid var(--divider-color);
        }
        :host([icon]:focus) {
          background: var(--divider-color);
        }
        ha-state-icon {
          transition: color 0.3s ease-in-out, filter 0.3s ease-in-out;
        }
        .missing {
          color: #fce588;
        }
      `,
    ];
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "state-badge": StateBadge;
  }
}

customElements.define("state-badge", StateBadge);
