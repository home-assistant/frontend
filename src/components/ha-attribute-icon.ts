import { HassEntity } from "home-assistant-js-websocket";
import { html, LitElement, nothing } from "lit";
import { customElement, property } from "lit/decorators";
import { until } from "lit/directives/until";
import { attributeIcon } from "../data/icons";
import { HomeAssistant } from "../types";
import "./ha-icon";
import "./ha-svg-icon";

@customElement("ha-attribute-icon")
export class HaAttributeIcon extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

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

    if (!this.hass) {
      return nothing;
    }

    const icon = attributeIcon(
      this.hass,
      this.stateObj,
      this.attribute,
      this.attributeValue
    ).then((icn) => {
      if (icn) {
        return html`<ha-icon .icon=${icn}></ha-icon>`;
      }
      return nothing;
    });

    return html`${until(icon)}`;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-attribute-icon": HaAttributeIcon;
  }
}
