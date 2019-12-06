import "../../../../../components/entity/ha-entity-picker";

import { LitElement, property, customElement, html } from "lit-element";
import { ActionElement } from "../ha-automation-action-row";
import { HomeAssistant } from "../../../../../types";
import { PolymerChangedEvent } from "../../../../../polymer-types";
import { fireEvent } from "../../../../../common/dom/fire_event";
import { SceneAction } from "../../../../../data/script";

@customElement("ha-automation-action-scene")
export class HaSceneAction extends LitElement implements ActionElement {
  @property() public hass!: HomeAssistant;
  @property() public action!: SceneAction;

  public static get defaultConfig(): SceneAction {
    return { scene: "" };
  }

  protected render() {
    const { scene } = this.action;

    return html`
      <ha-entity-picker
        .hass=${this.hass}
        .value=${scene}
        @value-changed=${this._entityPicked}
        .includeDomains=${["scene"]}
        allow-custom-entity
      ></ha-entity-picker>
    `;
  }

  private _entityPicked(ev: PolymerChangedEvent<string>) {
    ev.stopPropagation();
    fireEvent(this, "value-changed", {
      value: { ...this.action, scene: ev.detail.value },
    });
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-automation-action-scene": HaSceneAction;
  }
}
