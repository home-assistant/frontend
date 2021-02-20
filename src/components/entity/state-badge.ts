import type { HassEntity } from "home-assistant-js-websocket";
import {
  css,
  CSSResult,
  html,
  internalProperty,
  LitElement,
  property,
  PropertyValues,
  TemplateResult,
} from "lit-element";
import { ifDefined } from "lit-html/directives/if-defined";
import { styleMap } from "lit-html/directives/style-map";
import { computeActiveState } from "../../common/entity/compute_active_state";
import { computeStateDomain } from "../../common/entity/compute_state_domain";
import { stateIcon } from "../../common/entity/state_icon";
import { iconColorCSS } from "../../common/style/icon_color_css";
import type { HomeAssistant } from "../../types";
import "../ha-icon";

export class StateBadge extends LitElement {
  public hass?: HomeAssistant;

  @property() public stateObj?: HassEntity;

  @property() public overrideIcon?: string;

  @property() public overrideImage?: string;

  @property({ type: Boolean }) public stateColor?: boolean;

  @property({ type: Boolean, reflect: true, attribute: "icon" })
  private _showIcon = true;

  @internalProperty() private _iconStyle: { [name: string]: string } = {};

  protected render(): TemplateResult {
    const stateObj = this.stateObj;

    // We either need a `stateObj` or one override
    if (!stateObj && !this.overrideIcon && !this.overrideImage) {
      return html`<div class="missing">
        <ha-icon icon="hass:alert"></ha-icon>
      </div>`;
    }

    if (!this._showIcon) {
      return html``;
    }

    const domain = stateObj ? computeStateDomain(stateObj) : undefined;

    return html`
      <ha-icon
        style=${styleMap(this._iconStyle)}
        data-domain=${ifDefined(
          this.stateColor || (domain === "light" && this.stateColor !== false)
            ? domain
            : undefined
        )}
        data-state=${stateObj ? computeActiveState(stateObj) : ""}
        .icon=${this.overrideIcon || (stateObj ? stateIcon(stateObj) : "")}
      ></ha-icon>
    `;
  }

  protected updated(changedProps: PropertyValues) {
    if (
      !changedProps.has("stateObj") &&
      !changedProps.has("overrideImage") &&
      !changedProps.has("overrideIcon")
    ) {
      return;
    }
    const stateObj = this.stateObj;

    const iconStyle: { [name: string]: string } = {};
    const hostStyle: Partial<CSSStyleDeclaration> = {
      backgroundImage: "",
    };

    this._showIcon = true;

    if (stateObj) {
      // hide icon if we have entity picture
      if (
        ((stateObj.attributes.entity_picture_local ||
          stateObj.attributes.entity_picture) &&
          !this.overrideIcon) ||
        this.overrideImage
      ) {
        let imageUrl =
          this.overrideImage ||
          stateObj.attributes.entity_picture_local ||
          stateObj.attributes.entity_picture;
        if (this.hass) {
          imageUrl = this.hass.hassUrl(imageUrl);
        }
        hostStyle.backgroundImage = `url(${imageUrl})`;
        this._showIcon = false;
      } else if (stateObj.state === "on") {
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
            // eslint-disable-next-line
            console.warn(errorMessage);
          }
          // lowest brighntess will be around 50% (that's pretty dark)
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
      ha-icon {
        transition: color 0.3s ease-in-out, filter 0.3s ease-in-out;
      }
      .missing {
        color: #fce588;
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
