import { html, LitElement } from "lit";
import { customElement, property } from "lit/decorators";
import { fireEvent } from "../../../../../common/dom/fire_event";
import "../../../../../components/entity/ha-entity-picker";
import { SceneAction } from "../../../../../data/script";
import { PolymerChangedEvent } from "../../../../../polymer-types";
import { HomeAssistant } from "../../../../../types";
import { ActionElement } from "../ha-automation-action-row";

const includeDomains = ["scene"];

@customElement("ha-automation-action-scene")
export class HaSceneAction extends LitElement implements ActionElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

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
        .includeDomains=${includeDomains}
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
