import { html, LitElement } from "lit";
import { customElement, property } from "lit/decorators";
import { fireEvent } from "../../../../../common/dom/fire_event";
import "../../../../../components/entity/ha-entity-picker";
import { SceneAction } from "../../../../../data/script";
import { ValueChangedEvent, HomeAssistant } from "../../../../../types";
import { ActionElement } from "../ha-automation-action-row";

const includeDomains = ["scene"];

@customElement("ha-automation-action-activate_scene")
export class HaSceneAction extends LitElement implements ActionElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ type: Boolean }) public disabled = false;

  @property() public action!: SceneAction;

  public static get defaultConfig(): SceneAction {
    return {
      service: "scene.turn_on",
      target: {
        entity_id: "",
      },
      metadata: {},
    };
  }

  protected render() {
    let scene;

    if ("scene" in this.action) {
      scene = this.action.scene;
    } else {
      scene = this.action.target?.entity_id;
    }

    return html`
      <ha-entity-picker
        .hass=${this.hass}
        .label=${this.hass.localize(
          "ui.panel.config.automation.editor.actions.type.activate_scene.scene"
        )}
        .value=${scene}
        .disabled=${this.disabled}
        @value-changed=${this._entityPicked}
        .includeDomains=${includeDomains}
        allow-custom-entity
      ></ha-entity-picker>
    `;
  }

  private _entityPicked(ev: ValueChangedEvent<string>) {
    ev.stopPropagation();
    fireEvent(this, "value-changed", {
      value: {
        ...this.action,
        service: "scene.turn_on",
        target: {
          entity_id: ev.detail.value,
        },
        metadata: {},
      },
    });
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-automation-action-activate_scene": HaSceneAction;
  }
}
