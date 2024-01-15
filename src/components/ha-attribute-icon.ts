import { HassEntity } from "home-assistant-js-websocket";
import { html, LitElement, nothing } from "lit";
import { customElement, property } from "lit/decorators";
import { until } from "lit/directives/until";
import { attributeIcon } from "../data/icons";
import { HomeAssistant } from "../types";
import "./ha-icon";
import "./ha-svg-icon";
import { attributeIconPath } from "../common/entity/attribute_icon_path";

@customElement("ha-attribute-icon")
export class HaAttributeIcon extends LitElement {
  @property() public hass!: HomeAssistant;

  @property({ attribute: false }) public stateObj?: HassEntity;

  @property() public attribute?: string;

  @property() public attributeValue?: string;

  @property() public icon?: string;

  protected render() {
    if (this.icon) {
      return html`<ha-icon .icon=${this.icon}></ha-icon>`;
    }
    if (!this.stateObj || !this.attribute) {
      return nothing;
    }
    let icon = this.hass
      ? attributeIcon(
          this.hass,
          this.stateObj,
          this.attribute,
          this.attributeValue
        ).then((icn) => {
          if (icn) {
            return html`<ha-icon .icon=${icn}></ha-icon>`;
          }
          icon = undefined;
          return new Promise(() => {});
        })
      : undefined;
    return icon
      ? html`${until(
          icon,
          html`<ha-svg-icon
            .path=${attributeIconPath(
              this.stateObj,
              this.attribute,
              this.attributeValue
            )}
          ></ha-svg-icon>`
        )}`
      : html`<ha-svg-icon
          .path=${attributeIconPath(
            this.stateObj,
            this.attribute,
            this.attributeValue
          )}
        ></ha-svg-icon>`;
  }
}
declare global {
  interface HTMLElementTagNameMap {
    "ha-attribute-icon": HaAttributeIcon;
  }
}
