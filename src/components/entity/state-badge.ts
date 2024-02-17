import { mdiAlert } from "@mdi/js";
import type { HassEntity } from "home-assistant-js-websocket";
import {
  CSSResultGroup,
  LitElement,
  PropertyValues,
  css,
  html,
  nothing,
} from "lit";
import { property, state } from "lit/decorators";
import { ifDefined } from "lit/directives/if-defined";
import { styleMap } from "lit/directives/style-map";
import { computeDomain } from "../../common/entity/compute_domain";
import { computeStateDomain } from "../../common/entity/compute_state_domain";
import {
  stateColorBrightness,
  stateColorCss,
} from "../../common/entity/state_color";
import { iconColorCSS } from "../../common/style/icon_color_css";
import { cameraUrlWithWidthHeight } from "../../data/camera";
import { CLIMATE_HVAC_ACTION_TO_MODE } from "../../data/climate";
import type { HomeAssistant } from "../../types";
import "../ha-state-icon";

export class StateBadge extends LitElement {
  public hass?: HomeAssistant;

  @property({ attribute: false }) public stateObj?: HassEntity;

  @property() public overrideIcon?: string;

  @property() public overrideImage?: string;

  @property({ type: Boolean }) public stateColor = false;

  @property() public color?: string;

  // @todo Consider reworking to eliminate need for attribute since it is manipulated internally
  @property({ type: Boolean, reflect: true }) public icon = true;

  @state() private _iconStyle: { [name: string]: string | undefined } = {};

  connectedCallback(): void {
    super.connectedCallback();
    if (
      this.hasUpdated &&
      this.overrideImage === undefined &&
      (this.stateObj?.attributes.entity_picture ||
        this.stateObj?.attributes.entity_picture_local)
    ) {
      // Update image on connect, so we get new auth token
      this.requestUpdate("stateObj");
    }
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    if (
      this.overrideImage === undefined &&
      (this.stateObj?.attributes.entity_picture ||
        this.stateObj?.attributes.entity_picture_local)
    ) {
      // Clear image on disconnect so we don't fetch with old auth when we reconnect
      this.style.backgroundImage = "";
    }
  }

  private get _stateColor() {
    const domain = this.stateObj
      ? computeStateDomain(this.stateObj)
      : undefined;
    return this.stateColor || (domain === "light" && this.stateColor !== false);
  }

  protected render() {
    const stateObj = this.stateObj;

    // We either need a `stateObj` or one override
    if (!stateObj && !this.overrideIcon && !this.overrideImage) {
      return html`<div class="missing">
        <ha-svg-icon .path=${mdiAlert}></ha-svg-icon>
      </div>`;
    }

    if (!this.icon) {
      return nothing;
    }

    const domain = stateObj ? computeStateDomain(stateObj) : undefined;

    return html`<ha-state-icon
      .hass=${this.hass}
      style=${styleMap(this._iconStyle)}
      data-domain=${ifDefined(domain)}
      data-state=${ifDefined(stateObj?.state)}
      .icon=${this.overrideIcon}
      .stateObj=${stateObj}
    ></ha-state-icon>`;
  }

  public willUpdate(changedProps: PropertyValues<this>) {
    super.willUpdate(changedProps);
    if (
      !changedProps.has("stateObj") &&
      !changedProps.has("overrideImage") &&
      !changedProps.has("overrideIcon") &&
      !changedProps.has("stateColor") &&
      !changedProps.has("color")
    ) {
      return;
    }
    const stateObj = this.stateObj;

    const iconStyle: { [name: string]: string } = {};
    let backgroundImage = "";

    this.icon = true;

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
        const domain = computeDomain(stateObj.entity_id);
        if (domain === "camera") {
          imageUrl = cameraUrlWithWidthHeight(imageUrl, 80, 80);
        }
        backgroundImage = `url(${imageUrl})`;
        this.icon = false;
        if (domain === "update") {
          this.style.borderRadius = "0";
        } else if (domain === "media_player") {
          this.style.borderRadius = "8%";
        }
      } else if (this.color) {
        // Externally provided overriding color wins over state color
        iconStyle.color = this.color;
      } else if (this._stateColor) {
        const color = stateColorCss(stateObj);
        if (color) {
          iconStyle.color = color;
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
          iconStyle.filter = stateColorBrightness(stateObj);
        }
        if (stateObj.attributes.hvac_action) {
          const hvacAction = stateObj.attributes.hvac_action;
          if (hvacAction in CLIMATE_HVAC_ACTION_TO_MODE) {
            iconStyle.color = stateColorCss(
              stateObj,
              CLIMATE_HVAC_ACTION_TO_MODE[hvacAction]
            )!;
          } else {
            delete iconStyle.color;
          }
        }
      }
    } else if (this.overrideImage) {
      let imageUrl = this.overrideImage;
      if (this.hass) {
        imageUrl = this.hass.hassUrl(imageUrl);
      }
      backgroundImage = `url(${imageUrl})`;
      this.icon = false;
    }

    this._iconStyle = iconStyle;
    this.style.backgroundImage = backgroundImage;
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
          --state-inactive-color: initial;
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
          transition:
            color 0.3s ease-in-out,
            filter 0.3s ease-in-out;
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
