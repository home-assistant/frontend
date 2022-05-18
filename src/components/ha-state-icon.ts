import { HassEntity } from "home-assistant-js-websocket";
import { html, LitElement, TemplateResult } from "lit";
import { customElement, property } from "lit/decorators";
import { stateIconPath } from "../common/entity/state_icon_path";
import "./ha-icon";
import "./ha-svg-icon";

@customElement("ha-state-icon")
export class HaStateIcon extends LitElement {
  @property({ attribute: false }) public state?: HassEntity;

  @property() public icon?: string;

  // If we are displaying a historical state
  // we need to override the state string
  // to the value it had a the point in time
  @property() public overrideState?: string;

  protected render(): TemplateResult {
    if (this.icon || this.state?.attributes.icon) {
      return html`<ha-icon
        .icon=${this.icon || this.state?.attributes.icon}
      ></ha-icon>`;
    }
    return html`<ha-svg-icon
      .path=${stateIconPath(this.state, this.overrideState)}
    ></ha-svg-icon>`;
  }
}
declare global {
  interface HTMLElementTagNameMap {
    "ha-state-icon": HaStateIcon;
  }
}
