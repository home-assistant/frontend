import { consume, type ContextType } from "@lit/context";
import { mdiAlert } from "@mdi/js";
import type { HassEntity } from "home-assistant-js-websocket";
import type { CSSResultGroup, PropertyValues } from "lit";
import { LitElement, css, html, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
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
import { connectionContext } from "../../data/context";
import type { HomeAssistant } from "../../types";
import { isBrandUrl } from "../../util/brands-url";
import "../ha-state-icon";

@customElement("state-badge")
export class StateBadge extends LitElement {
  public hass?: HomeAssistant;

  @property({ attribute: false }) public stateObj?: HassEntity;

  @property({ attribute: false }) public overrideIcon?: string;

  @property({ attribute: false }) public overrideImage?: string;

  // Cannot be a boolean attribute because undefined is treated different than
  // false.  When it is undefined, state is still colored for light entities.
  @property({ attribute: false }) public stateColor?: boolean;

  @property() public color?: string;

  // @todo Consider reworking to eliminate need for attribute since it is manipulated internally
  @property({ type: Boolean, reflect: true }) public icon = true;

  @state()
  @consume({ context: connectionContext, subscribe: true })
  private _connection?: ContextType<typeof connectionContext>;

  @state() private _iconStyle: Record<string, string | undefined> = {};

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
    return this.stateColor ?? domain === "light";
  }

  protected render() {
    const stateObj = this.stateObj;

    // We either need a `stateObj` or one override
    if (!stateObj && !this.overrideIcon && !this.overrideImage) {
      return html`<div class="missing">
        <ha-svg-icon .path=${mdiAlert}></ha-svg-icon>
      </div>`;
    }

    const cls = this.getClass();
    if (cls) {
      cls.forEach((toSet, className) => {
        if (!toSet) {
          this.classList.remove(className);
        } else {
          this.classList.add(className);
        }
      });
    }

    if (!this.icon) {
      return nothing;
    }

    const domain = stateObj ? computeStateDomain(stateObj) : undefined;

    return html`<ha-state-icon
      style=${styleMap(this._iconStyle)}
      data-domain=${ifDefined(domain)}
      data-state=${ifDefined(stateObj?.state)}
      .icon=${this.overrideIcon}
      .stateObj=${stateObj}
    ></ha-state-icon>`;
  }

  public willUpdate(changedProps: PropertyValues) {
    super.willUpdate(changedProps);
    if (
      !changedProps.has("stateObj") &&
      !changedProps.has("overrideImage") &&
      !changedProps.has("overrideIcon") &&
      !changedProps.has("stateColor") &&
      !changedProps.has("color") &&
      !changedProps.has("_connection")
    ) {
      return;
    }
    const stateObj = this.stateObj;

    const iconStyle: Record<string, string> = {};
    let backgroundImage = "";

    this.icon = true;

    if (stateObj) {
      const domain = computeDomain(stateObj.entity_id);
      if (this.overrideImage === undefined) {
        // hide icon if we have entity picture
        if (
          (stateObj.attributes.entity_picture_local ||
            stateObj.attributes.entity_picture) &&
          !this.overrideIcon
        ) {
          let imageUrl = this._resolveImageUrl(
            stateObj.attributes.entity_picture_local ||
              stateObj.attributes.entity_picture
          );
          if (domain === "camera") {
            imageUrl = cameraUrlWithWidthHeight(imageUrl, 80, 80);
          }
          backgroundImage = `url(${imageUrl})`;
          this.icon = false;
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
        backgroundImage = `url(${this._resolveImageUrl(this.overrideImage)})`;
        this.icon = false;
      }
    }

    this._iconStyle = iconStyle;
    this.style.backgroundImage = backgroundImage;
  }

  // Sign the image URL so brand images (/api/brands/...) get their access
  // token. `hassUrl` comes from the passed `hass` when available, falling back
  // to the connection context so this works in components that no longer
  // provide `hass`. Without a way to sign, a brands request would be rejected
  // (and logged/blocked by core), so skip it until we can sign.
  private _resolveImageUrl(url: string | undefined): string {
    if (!url) {
      return "";
    }
    const hassUrl = this.hass?.hassUrl ?? this._connection?.hassUrl;
    if (hassUrl) {
      return hassUrl(url);
    }
    return isBrandUrl(url) ? "" : url;
  }

  protected getClass() {
    const cls = new Map(
      ["has-no-radius", "has-media-image", "has-image"].map((_cls) => [
        _cls,
        false,
      ])
    );
    if (this.stateObj) {
      const domain = computeDomain(this.stateObj.entity_id);
      if (domain === "update") {
        cls.set("has-no-radius", true);
      } else if (domain === "media_player" || domain === "camera") {
        cls.set("has-media-image", true);
      } else if (this.style.backgroundImage !== "") {
        cls.set("has-image", true);
      }
    }
    return cls;
  }

  static get styles(): CSSResultGroup {
    return [
      iconColorCSS,
      css`
        :host {
          position: relative;
          display: inline-flex;
          width: 40px;
          color: var(--state-icon-color);
          border-radius: var(--state-badge-border-radius, 50%);
          height: 40px;
          background-size: cover;
          box-sizing: border-box;
          --state-inactive-color: initial;
          align-items: center;
          justify-content: center;
        }
        :host(.has-image) {
          border-radius: var(--state-badge-with-image-border-radius, 50%);
        }
        :host(.has-media-image) {
          border-radius: var(--state-badge-with-media-image-border-radius, 8%);
        }
        :host(.has-no-radius) {
          border-radius: var(--ha-border-radius-square);
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
